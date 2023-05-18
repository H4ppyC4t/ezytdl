const { app } = require('electron')

module.exports = async (startTime) => {
    console.log(`[${Date.now() - startTime}ms] BEGINNING TESTRUN`);

    const testObject = {};

    if(!require('fs').existsSync('./devscripts/tests/')) {
        console.log(`[${Date.now() - startTime}ms] No tests found!`);
        global.quitting = true;
        app.quit();
        return;
    } else {
        const tests = require('fs').readdirSync('./devscripts/tests').filter(f => f.endsWith('.js')).sort();
    
        for(const i in tests) await new Promise(async (res) => {
            const testFile = tests[i];
    
            const test = require(`./tests/${testFile}`);

            const startedThisTest = Date.now();
    
            console.log(`[${Date.now() - startTime}ms] - ${testFile} (${Number(i)+1}/${tests.length})`);

            let timeout = setTimeout(() => {
                if(!testObject[testFile]) {
                    testObject[testFile] = {
                        time: Date.now() - startedThisTest,
                        passed: false,
                        result: `TIMED OUT`,
                    }
                    console.log(`[${Date.now() - startTime}ms / ${Date.now() - startedThisTest}] - ${testFile} (${Number(i)+1}/${tests.length}) -- TIMED OUT.`)
                    res();
                }
            }, 15000)

            test().then(result => {
                clearTimeout(timeout);
                if(!testObject[testFile]) {
                    testObject[testFile] = {
                        time: Date.now() - startedThisTest,
                        passed: true,
                        result,
                    }
                    console.log(`[${Date.now() - startTime}ms / ${Date.now() - startedThisTest}] - ${testFile} (${Number(i)+1}/${tests.length}) - `, result)
                };
                res();
            }).catch(e => {
                clearTimeout(timeout);
                testObject[testFile] = {
                    time: Date.now() - startedThisTest,
                    passed: false,
                    result: e,
                }
                console.log(`[${Date.now() - startTime}ms / ${Date.now() - startedThisTest}] - ${testFile} (${Number(i)+1}/${tests.length}) - FAILED - `, result)
                res();
            })
        });

        console.log(testObject);

        const passed = Object.values(testObject).map(o => o.passed).length, total = Object.keys(testObject).length;
        console.log(`[${Date.now() - startTime}ms] ${passed}/${total} tests passed.`);

        if(passed != total) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}