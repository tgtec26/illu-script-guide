/* Git runs outside Illustrator. All arguments use execFile/spawn, never a shell command. */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
function createUpdater(panelDir, stateDir) {
    panelDir = fs.realpathSync(panelDir);
    var repo = fs.realpathSync(path.resolve(panelDir, '../..'));
    var key = require('crypto').createHash('sha256').update(repo).digest('hex').slice(0,16);
    var dir = stateDir || path.join(os.homedir(), '.illu-script-updater', 'panel-jobs', key);
    var jobFile = path.join(dir, 'result.json'), scheduling = false;
    function git(args, cwd) {
        return new Promise(function(resolve, reject) {
            var env = Object.assign({}, process.env, {GIT_TERMINAL_PROMPT:'0', GCM_INTERACTIVE:'Never'});
            cp.execFile('git', args, {cwd:cwd || repo, env:env, timeout:30000, windowsHide:true, maxBuffer:1024*1024}, function(err, out, stderr) {
                if (err) { reject(new Error((stderr || err.message).trim())); return; }
                resolve(out.trim());
            });
        });
    }
    async function check(root) {
        if (!root) throw new Error('스크립트 폴더를 먼저 지정하세요.');
        var top = await git(['rev-parse','--show-toplevel'], root);
        if (fs.realpathSync(top) !== repo) throw new Error('선택한 폴더는 패널과 다른 프로젝트입니다. 이 프로젝트의 스크립트 폴더를 지정하세요.');
        var branch = await git(['symbolic-ref','--quiet','--short','HEAD']);
        var remote = await git(['config','--get','branch.' + branch + '.remote']);
        var merge = await git(['config','--get','branch.' + branch + '.merge']);
        if (remote === '.' || remote.charAt(0) === '-' || merge.indexOf('refs/heads/') !== 0) throw new Error('추적 중인 원격 브랜치가 필요합니다.');
        await git(['fetch','--no-tags',remote,merge]);
        var local = await git(['rev-parse','HEAD']);
        var upstream = await git(['rev-parse','FETCH_HEAD']);
        var counts = (await git(['rev-list','--left-right','--count',local + '...' + upstream])).split(/\s+/).map(Number);
        var dirty = !!(await git(['status','--porcelain','--untracked-files=normal']));
        var kind = counts[0] && counts[1] ? 'diverged' : counts[1] ? (dirty ? 'dirty' : 'behind') : counts[0] ? 'ahead' : 'current';
        return {kind:kind, local:local.slice(0,7), remote:upstream.slice(0,7), branch:branch,
            ahead:counts[0], behind:counts[1], dirty:dirty, canUpdate:kind === 'behind'};
    }
    function readJob() {
        try {
            var job = JSON.parse(fs.readFileSync(jobFile,'utf8').replace(/^\uFEFF/,''));
            if ((job.state === 'waiting' || job.state === 'running') && job.pid) {
                try { process.kill(job.pid,0); } catch (e) { job.state = 'failed'; job.message = '업데이트 프로세스가 종료되었습니다. 로그를 확인하고 다시 시도하세요.'; }
            } else if (job.state === 'waiting' && Date.now() - job.started > 60000) {
                job.state = 'failed'; job.message = '업데이트 실행 창을 열지 못했습니다. 다시 시도하세요.';
            }
            return job;
        } catch (e) { return null; }
    }
    function launch(file, args) {
        return new Promise(function(resolve,reject) {
            var child = cp.spawn(file,args,{detached:true,stdio:'ignore',windowsHide:true});
            child.once('error',reject);
            child.once('spawn',function(){ child.unref(); resolve(); });
        });
    }
    function quote(s) { return "'" + s.replace(/'/g,"'\\''") + "'"; }
    async function schedule(root) {
        if (scheduling) throw new Error('이미 업데이트를 준비하고 있습니다.');
        scheduling = true;
        var createdJob = false, lockFile = null;
        try {
            var old = readJob();
            if (old && (old.state === 'waiting' || old.state === 'running')) throw new Error('이미 업데이트가 예약되어 있습니다. Illustrator를 종료하세요.');
            var state = await check(root);
            if (!state.canUpdate && !(old && old.state === 'failed' && (state.kind === 'current' || state.kind === 'ahead') && !state.dirty)) throw new Error('업데이트할 수 없는 상태입니다. 상태를 다시 확인하세요.');
            if (process.platform !== 'win32' && process.platform !== 'darwin') throw new Error('Windows와 macOS에서 지원합니다.');
            fs.mkdirSync(dir,{recursive:true});
            var lock = path.join(dir,'launch.lock');
            try { fs.closeSync(fs.openSync(lock,'wx')); lockFile = lock; }
            catch (e) { throw new Error('다른 패널에서 업데이트를 준비하고 있습니다. 잠시 후 다시 확인하세요.'); }
            old = readJob();
            if (old && (old.state === 'waiting' || old.state === 'running')) throw new Error('이미 업데이트가 예약되어 있습니다. Illustrator를 종료하세요.');
            // Copy the runner: git pull may replace the source file during execution.
            var work = fs.mkdtempSync(path.join(dir,'run-'));
            fs.writeFileSync(jobFile,JSON.stringify({state:'waiting',started:Date.now(),message:'Illustrator 종료를 기다리고 있습니다. 저장 확인 창을 확인하세요.',log:path.join(work,'update.log')}));
            createdJob = true;
            if (process.platform === 'win32') {
                var worker = path.join(work,'update.ps1');
                fs.copyFileSync(path.join(panelDir,'update-after-close.ps1'),worker);
                var powershell = path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
                await launch(powershell,['-NoProfile','-ExecutionPolicy','Bypass','-File',worker,'-RepoDir',repo,'-JobFile',jobFile,'-Branch',state.branch]);
            } else {
                var runner = path.join(work,'update.command');
                fs.copyFileSync(path.join(panelDir,'update-after-close.command'),path.join(work,'worker.sh'));
                fs.writeFileSync(runner,'#!/bin/bash\nexec /bin/bash ' + [path.join(work,'worker.sh'),repo,jobFile,state.branch].map(quote).join(' ') + '\n',{mode:0o700});
                await launch('/usr/bin/open',['-a','Terminal',runner]);
            }
            return readJob();
        } catch (e) {
            // Do not overwrite an existing active job on duplicate clicks.
            var job = readJob();
            if (createdJob && job && job.state === 'waiting') {
                job.state = 'failed'; job.message = e.message; fs.writeFileSync(jobFile,JSON.stringify(job));
            }
            throw e;
        } finally {
            if (lockFile) { try { fs.unlinkSync(lockFile); } catch (e) {} }
            scheduling = false;
        }
    }
    return {check:check,schedule:schedule,readJob:readJob};
}
module.exports = {createUpdater:createUpdater};
