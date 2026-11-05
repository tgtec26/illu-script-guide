const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../tools/script-panel/main.js'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function panel(check, schedule, job) {
    const elements = {};
    const timers = [];
    function element() {
        return {style:{}, hidden:true, disabled:false, firstChild:{},
            appendChild(){}, setAttribute(name, value){ this[name] = value; }};
    }
    const document = {documentElement:{}, createElement:element,
        getElementById(id){ return elements[id] || (elements[id] = element()); }};
    const updater = {check, schedule, readJob(){ return job || null; }};
    vm.runInNewContext(source, {
        setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout(id) { timers[id - 1] = null; },
        document, localStorage:{getItem(key){ return key === 'sp.root' ? '"/scripts"' : null; }},
        window:{location:{href:'file:///panel/index.html'},
            __adobe_cep__:{evalScript(call, done){ done(''); }},
            cep_node:{require(name){ return name.endsWith('updater.js') ? {createUpdater(){ return updater; }} : require(name); }}}
    });
    await settle();
    elements.runTimers = () => timers.splice(0).forEach(fn => { if (fn) fn(); });
    return elements;
}

(async function () {
    const current = {kind:'current', behind:0, dirty:false, canUpdate:false};
    let offline = true;
    const ui = await panel(async () => {
        if (offline) throw new Error('fetch: connection refused');
        return current;
    }, () => { throw new Error('Must not install after a failed check'); });
    assert(ui.updateNow.className.includes('attention'));
    assert.equal(ui.updateNow.disabled, false, 'Error icon must remain clickable');
    ui.updateNow.onclick(); await settle();
    assert.equal(ui.updates.hidden, false);
    assert(ui.updateText.textContent.includes('fetch: connection refused'));
    offline = false;
    ui.updateNow.onclick(); await settle();
    assert(ui.updateNow.className.includes('current'), 'Retry must recover from transient errors');

    const completed = await panel(async () => current, async () => {}, {state:'done', message:'업데이트 완료'});
    completed.updateNow.onclick(); await settle();
    assert.equal(completed.updates.hidden, false);
    completed.runTimers();
    assert.equal(completed.updates.hidden, true, 'Successful message must disappear');
    assert(completed.updateNow.title.includes('업데이트 완료'), 'Details remain in tooltip');

    const blocked = await panel(async () => ({kind:'dirty', behind:1, dirty:true, canUpdate:false}),
        () => { throw new Error('Must not install over local changes'); });
    assert.equal(blocked.updateNow.disabled, false);
    blocked.updateNow.onclick(); await settle();
    assert.equal(blocked.updates.hidden, false);
    assert(blocked.updateText.textContent.includes('로컬 수정'));
    blocked.runTimers(); assert.equal(blocked.updates.hidden, false, 'Errors remain visible');

    const ready = await panel(async () => ({kind:'behind', behind:1, dirty:false, canUpdate:true}),
        async () => ({state:'waiting', message:'작업을 저장하고 Illustrator를 종료하면 업데이트합니다.'}));
    ready.updateNow.onclick();
    assert.equal(ready.updateNow.disabled, true, 'Ignore duplicate clicks while scheduling');
    await settle();
    assert.equal(ready.updates.hidden, false);
    assert(ready.updateText.textContent.includes('Illustrator를 종료'));

    const retryAhead = await panel(async () => ({kind: 'ahead', behind:0, dirty:false, canUpdate:false}), async () => ({state: 'waiting', message: 'job'}), {state: 'failed', message: 'job'});
    assert(retryAhead.updateNow.title.includes('설치 재시도'), '설치 재시도');

    const failed = await panel(async () => ({kind:'behind', behind:1, dirty:false, canUpdate:true}),
        async () => { throw new Error('Terminal launch failed'); });
    failed.updateNow.onclick(); await settle();
    assert.equal(failed.updates.hidden, false, 'Launch errors must be visible after clicking');
    assert(failed.updateText.textContent.includes('Terminal launch failed'));
    console.log('PASS: error click/retry, recovery, local edits blocked, scheduling notice, launch error');
})().catch(error => { console.error(error); process.exitCode = 1; });
