const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const {createUpdater} = require('../tools/script-panel/updater');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-update-'));
function git(cwd, ...args) { return cp.execFileSync('git', args, {cwd, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim(); }
function commit(dir, name) { fs.writeFileSync(path.join(dir, name), name); git(dir,'add',name); git(dir,'-c','user.name=fixture','-c','user.email=fixture@example.test','commit','-m',name); }
(async function () {
    const remote = path.join(base,'remote.git'), local = path.join(base,'local with spaces'), peer = path.join(base,'peer');
    git(base,'init','--bare',remote);
    git(base,'clone',remote,local);
    git(local,'checkout','-b','main');
    fs.mkdirSync(path.join(local,'tools','script-panel'),{recursive:true});
    fs.writeFileSync(path.join(local,'setup-windows.ps1'),'# fixture');
    fs.writeFileSync(path.join(local,'setup-mac.command'),'# fixture');
    fs.copyFileSync(path.join(__dirname,'../tools/script-panel/update-after-close.ps1'),path.join(local,'tools','script-panel','update-after-close.ps1'));
    git(local,'add','.'); commit(local,'first'); git(local,'push','-u','origin','main');
    git(base,'clone','-b','main',remote,peer);
    const updater = createUpdater(path.join(local,'tools','script-panel'),path.join(base,'state'));
    const link = path.join(base,'panel link');
    fs.symlinkSync(path.join(local,'tools','script-panel'),link,'junction');
    const linkedUpdater = createUpdater(link,path.join(base,'linked-state'));
    assert.equal((await linkedUpdater.check(local)).kind,'current');
    let state = await updater.check(local); assert.equal(state.kind,'current');
    fs.writeFileSync(path.join(local,'temporary.svg'),'keep');
    state = await updater.check(local); assert.equal(state.kind,'current'); assert.equal(state.canUpdate,false);
    fs.unlinkSync(path.join(local,'temporary.svg'));
    commit(peer,'remote'); git(peer,'push');
    state = await updater.check(local); assert.equal(state.kind,'behind'); assert.equal(state.behind,1); assert.equal(state.canUpdate,true);
    if (process.platform === 'win32') {
    // The launcher is mocked: no installed app or real updater is started.
    const realSpawn = cp.spawn;
    let launchArgs;
    cp.spawn = function(file,args,options) {
        launchArgs = {file,args,options};
        const child = new (require('events').EventEmitter)(); child.unref = function(){};
        process.nextTick(()=>child.emit('spawn')); return child;
    };
    try {
        const job = await updater.schedule(local); assert.equal(job.state,'waiting');
        assert(launchArgs.options.detached); assert(launchArgs.options.windowsHide);
        assert(launchArgs.args.includes('-File')); assert(launchArgs.args.includes(local));
        await assert.rejects(updater.schedule(local));
        assert.equal(updater.readJob().state,'waiting');
    } finally { cp.spawn=realSpawn; }
    }
    fs.writeFileSync(path.join(local,'unsaved.txt'),'keep');
    state = await updater.check(local); assert.equal(state.kind,'dirty'); assert.equal(state.canUpdate,false);
    fs.unlinkSync(path.join(local,'unsaved.txt'));
    commit(local,'local'); state = await updater.check(local); assert.equal(state.kind,'diverged'); assert.equal(state.canUpdate,false);
    git(local,'-c','user.name=fixture','-c','user.email=fixture@example.test','pull','--no-rebase','--no-edit','-s','ours');
    state = await updater.check(local); assert.equal(state.kind,'ahead');
    fs.writeFileSync(path.join(local,'temporary.svg'),'keep');
    state = await updater.check(local); assert.equal(state.kind,'ahead'); assert.equal(state.canUpdate,false);
    fs.unlinkSync(path.join(local,'temporary.svg'));
    await assert.rejects(updater.check(peer),/다른|프로젝트/);
    git(local,'checkout','--detach'); await assert.rejects(updater.check(local));
    git(local,'checkout','main');
    git(local,'remote','set-url','origin',path.join(base,'missing'));
    await assert.rejects(updater.check(local));
    // Execute the real Windows worker against a disposable checkout and fake setup.
    if (process.platform === 'win32') {
        const workerRepo = path.join(base,'worker repo'); fs.mkdirSync(workerRepo);
        git(workerRepo,'init','-b','main');
        const setup = path.join(workerRepo,'setup-windows.ps1');
        fs.writeFileSync(setup,'Write-Output "fixture setup"\nexit 0\n'); commit(workerRepo,'seed'); git(workerRepo,'add','.');
        git(workerRepo,'-c','user.name=fixture','-c','user.email=fixture@example.test','commit','-m','setup');
        const workerRemote = path.join(base,'worker-remote.git'); git(base,'init','--bare',workerRemote);
        git(workerRepo,'remote','add','origin',workerRemote); git(workerRepo,'push','-u','origin','main');
        const worker = path.join(base,'worker.ps1');
        let source = fs.readFileSync(path.join(__dirname,'../tools/script-panel/update-after-close.ps1'),'utf8');
        // Never wait on or interact with a real Illustrator process in automated tests.
        source = source.replace('Get-Process -Name Illustrator','Get-Process -Name IlluFixtureNotRunning');
        fs.writeFileSync(worker,source);
        const jobFile = path.join(base,'job.json');
        function runWorker(expected, branch='main') {
            fs.writeFileSync(jobFile,JSON.stringify({state:'waiting',message:'',log:path.join(base,'worker.log')}));
            let failed = false;
            try { cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',worker,'-RepoDir',workerRepo,'-JobFile',jobFile,'-Branch',branch],{timeout:20000,stdio:'pipe'}); } catch(e) { failed=true; if(expected==='done') throw new Error(String(e.stderr || e.stdout || e)); }
            const job = JSON.parse(fs.readFileSync(jobFile,'utf8'));
            assert.equal(job.state,expected); assert.equal(failed,expected==='failed');
        }
        runWorker('done');
        runWorker('failed','wrong-branch');
        fs.writeFileSync(path.join(workerRepo,'dirty.txt'),'keep'); runWorker('failed');
        fs.unlinkSync(path.join(workerRepo,'dirty.txt'));
        fs.writeFileSync(setup,'exit 7\n'); git(workerRepo,'add','.'); git(workerRepo,'-c','user.name=fixture','-c','user.email=fixture@example.test','commit','-m','failing setup');
        runWorker('failed');
    }
    console.log('PASS: current, behind, dirty, diverged, ahead, junction path, different repo, detached, offline, Windows worker success/branch change/local edits/setup failure');
})().catch(e=>{console.error(e); process.exitCode=1;}).finally(()=>fs.rmSync(base,{recursive:true,force:true}));
