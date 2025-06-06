const child_process = require(`child_process`);
const fs = require(`fs`);
const which = require('which');

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers')

const buildArgs = yargs(hideBin(process.argv)).argv;

// previous store: electron-builder -c ./package-build-store.json -p never
// previous dist: electron-builder -c ./package-build.json -p always

let buildDir = null;

const config = Object.assign({
    "appId": "dev.sylviiu.ezytdl",
    "productName": "ezytdl",
    "artifactName": "${productName}-${platform}.${ext}",
    "portable": {
        "artifactName": "${productName}-${platform}-portable.${ext}"
    },
    "compression": "normal",
    "asar": true,
    "asarUnpack": [],
    "files": [
        "html/*.html",
        "html/*.js",
        "html/assets/**/*",
        "html/lib/*",
        "html/topjs/*",
        "html/afterload/*",
        "html/util/*",
        "html/pagescripts/*",
        "html/tabs/*",
        "html/scripts/*",
        "node_modules/**/*",
        "res/*.*",
        "res/trayIcons/*",
        "res/img/*",
        "res/svg/*",
        "res/packageIcons/*",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/*.d.ts",
        "!**/node_modules/*.bin",
        "!**/node_modules/*.exe",
        "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
        "!.editorconfig",
        "!**/._*",
        "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
        "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
        "!**/{appveyor.yml,.travis.yml,circle.yml}",
        "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
        "res/*.mp4",
        "dist/trayIcons/*",
        "package.json",
        "build.json",
        "index.js",
        "init.js",
        "build-init.json",
        "init/*.js",
        "server.js",
        "getConfig.js",
        "defaultConfig.json",
        "configStrings.json",
        "configDescriptions.json",
        "util/*.js",
        "util/*.json",
        "util/*/*.js",
        "core/*.js",
        "core/*.json",
        "core/ipc/*.js",
        "core/ipc/*/*/*.js",
        "core/authentication/*.js",
        "core/authentication/*.json",
        "core/confighooks/*.js",
        "core/depcheck/*/*.js",
        "core/depcheck/*.js",
        "core/*.js",
        "system/*.js",
        "system/*/*.js",
        "devscripts/testrun.js",
        "devscripts/*/*.js",
        "checks/*.js"
    ],
    extraMetadata: {},
}, fs.readdirSync(`./build/targets/`).map(s => require(`./build/targets/${s}`)).reduce((a, b) => Object.assign(a, b), {}));

console.log(config);

let fullMetadataDone = false;

const getFullMetadata = () => new Promise(async res => {
    if(fullMetadataDone) return res(config);

    const pkg = require(`./package.json`);
    const details = require(`./util/build/packageDetails.js`);

    const obj = {
        commitHash: `unk`,
        fullCommitHash: `unknown`,
        owner: [`sylviiu`, `ezytdl`],
        branch: null,
        buildNumber: buildArgs.buildNumber || -1,
        buildInfo: {
            "Electron": {
                "Version": pkg.devDependencies.electron.replace(`^`, ``),
                "Built with": `electron-builder ` + pkg.devDependencies['electron-builder'].replace(`^`, ``),
            },
            "Libraries": {
                app: {},
                src: {}
            }
        },
    };

    for(const name of Object.keys(pkg.dependencies).sort()) {
        obj.buildInfo.Libraries.app[name] = await details(name);
    }

    for(const name of Object.keys(pkg.devDependencies).sort()) {
        obj.buildInfo.Libraries.src[name] = await details(name);
    }

    const git = await which(`git`, { nothrow: true });

    if(git) {
        const toAppend = {};

        await Promise.all([
            new Promise(async res => {
                // commit hash
                child_process.execFile(git, [`rev-parse`, `--short`, `HEAD`], (err, stdout, stderr) => {
                    if(err) return res();
                    if(stdout && stdout.toString && stdout.toString()) toAppend.commitHash = stdout.toString().trim();
                    res();
                });
            }),
            new Promise(async res => {
                // full commit hash
                child_process.execFile(git, [`rev-parse`, `HEAD`], (err, stdout, stderr) => {
                    if(err) return res();
                    if(stdout && stdout.toString && stdout.toString()) toAppend.fullCommitHash = stdout.toString().trim();
                    res();
                });
            }),
            new Promise(async res => {
                // branch
                child_process.execFile(git, [`symbolic-ref`, `HEAD`], (err, stdout, stderr) => {
                    if(err) return res();
                    if(stdout && stdout.toString && stdout.toString()) toAppend.branch = stdout.toString().trim();
                    res();
                });
            }),
            new Promise(async res => {
                // owner
                child_process.execFile(git, [`remote`, `get-url`, `origin`], (err, stdout, stderr) => {
                    if(err) return res();
                    if(stdout && stdout.toString && stdout.toString()) toAppend.owner = stdout.toString().trim().split(`/`).filter(Boolean).slice(-2);
                    res();
                });
            }),
        ])

        Object.assign(obj, toAppend);
    }

    Object.assign(config.extraMetadata, obj);

    Object.assign(config.extraMetadata.buildInfo, {
        "ezytdl": {
            "Version": pkg.version,
            "Commit": obj.fullCommitHash || `unknown`,
            "Built": obj.buildDate || global.startTime,
        },
    });

    fullMetadataDone = true;

    console.log(`extra metadata`, config.extraMetadata)

    return res(config);
})

if(require.main == module) {
    getFullMetadata().then(() => {
        const pkg = JSON.parse(fs.readFileSync(`./package.json`).toString());
        
        which(`npm`).then(async npm => {
            const spawnProc = (path, cwd, testrun) => {
                const spawnPath = path == `npm` ? npm : path;
        
                console.log(`Spawning ${spawnPath} at cwd ${cwd}`);
        
                const proc = child_process.spawn(spawnPath, path == `npm` ? [`run`, `s`, `--`, ...(testrun ? [`--testrun`] : [])] : [...(testrun ? [`--testrun`] : [])], { cwd });
        
                let passed = false;
        
                const data = data => {
                    const str = data.toString().trim();
                    console.log(str);
        
                    if(str.includes(`TESTRUN PASSED.`)) {
                        console.log(`Passed testrun!`);
                        passed = true;
                    }
                }
        
                proc.stdout.on(`data`, data);
                proc.stderr.on(`data`, data);
        
                proc.on(`error`, (err) => {
                    console.log(`Testrun errored with ${err}`);
                    global.quitting = true;
                    process.exit(1);
                })
        
                proc.on(`close`, (code) => {
                    const exitWithCode = passed ? 0 : 1
                    console.log(`Testrun closed with code ${code}; exiting with code ${exitWithCode}`);
                    global.quitting = true;
                    process.exit(exitWithCode);
                });
            }
        
            const start = async (testrun) => {
                console.log(`starting! (buildDir: "${buildDir}")`);
                if(process.argv.find(s => s == `--from-source`)) {
                    console.log(`Running from source...`)
                    spawnProc(`npm`, __dirname, testrun)
                } else {
                    if(process.platform == `darwin`) {
                        spawnProc(require(`path`).join(buildDir, `${config.productName}.app`, `Contents`, `MacOS`, `${config.productName}`), require(`path`).join(__dirname, `dist`), testrun)
                    } else {
                        const folder = buildDir ? require(`path`).parse(buildDir).base : null;
                    
                        if(!folder) {
                            console.log(`No unpacked folder found!`);
                            process.exit(1);
                        } else {
                            console.log(`Found unpacked folder ${folder}!`);
                    
                            const file = fs.readdirSync(`./dist/${folder}/`).find(s => s.startsWith(`ezytdl`));
                    
                            if(!file) {
                                console.log(`No file found!`);
                                process.exit(1);
                            } else {
                                console.log(`Found file ${file}!`);
                    
                                const cwd = require(`path`).join(__dirname, `dist`, folder)
                                const path = require(`path`).join(cwd, file);
                    
                                spawnProc(path, cwd, testrun)
                            }
                        }
                    }
                }
            };
        
            const build = () => new Promise(async res => {
                const args = (process.argv.find(s => s == `--from-source`)) ? [`build`, `nopack`, `nightly`, `--build-number`, `1`] : [`build`, `pack`, `nightly`, `--build-number`, `1`];

                console.log(`packing...`);
                child_process.execFile(await which(`node`), args, {}, (error, stdout, stderr) => {
                    if(error) {
                        return console.error(`failed to build:`, error);
                    } else {
                        console.log(`packed!`);
                        const str = stdout.toString().split(`\n`).filter(Boolean);
                        const outDir = str.find(s => s.includes(`appOutDir=dist`))
                        if(outDir) buildDir = require(`path`).join(__dirname, `dist`, outDir.split(`appOutDir=dist`)[1]);
                        res(buildDir);
                    }
                });
            });
        
            if(process.argv.find(s => s == `start`)) {
                console.log(`running start`)
                build().then(() => start(false))
            } else if(process.argv.find(s => s == `test`)) {
                console.log(`running test`)
                build().then(() => start(true))
            } else {
                console.log(`Building for ${process.platform}... (${process.env["CSC_LINK"] && process.env["CSC_KEY_PASSWORD"] ? "SIGNED" : "UNSIGNED"})`);
                
                if(process.argv.find(s => s == `store`)) {
                    console.log(`Using store compression...`);
                    config.compression = "store";
                } else {
                    console.log(`Using ${config.compression} compression...`);
                    //config.compression = "maximum";
                }
                
                if(process.argv.find(s => s == `noasar`)) {
                    console.log(`Disabling asar...`);
                    config.asar = false;
                }
                
                if(process.argv.find(s => s == `publish`)) {
                    console.log(`Publishing...`);
                    config.publish = {
                        "provider": "github",
                        "owner": "sylviiu",
                        "repo": "ezytdl",
                        "vPrefixedTagName": false,
                        "releaseType": "draft"
                    };
                } else if(process.argv.find(s => s == `nightly`)) {
                    console.log(`Using nightly build...`);
        
                    if(!buildArgs.buildNumber) {
                        console.log(`No build number found! (--build-number)`);
                        process.exit(1);
                    }
                
                    config.extraMetadata.version = `${pkg.version}-dev.${buildArgs.buildNumber}`;
                
                    //config.productName += `nightly`;
                
                    //config.appId += `nightly`;
                    
                    config.publish = {
                        "provider": "github",
                        "owner": "sylviiu",
                        "repo": "ezytdl",
                        "vPrefixedTagName": false,
                        "releaseType": "draft"
                    };
                }
        
                console.log(`Building:\n| ${config.productName} (${config.appId})\n| version: ${config.extraMetadata.version}\n| commit: ${config.extraMetadata.commitHash}\n| full commit: ${config.extraMetadata.fullCommitHash}\n| build number: ${config.extraMetadata.buildNumber}`)
        
                if(process.argv.find(s => s == `pack`)) {
                    console.log(`Pack flag found (removing targets)...`);
        
                    config.win.target = [];
                    config.linux.target = [];
                    config.mac.target = [];
                }
        
                if(process.argv.find(s => s == `nopack`) || process.argv.find(s => s == `pack`)) {
                    console.log(`Not fully building, removing signatures...`);
                    
                    delete process.env["CSC_LINK"];
                    delete process.env["CSC_KEY_PASSWORD"];
                }
        
                if(!process.argv.find(s => s == `nopack`)) {
                    config.extraMetadata.buildDate = Date.now();

                    console.log(`Running beforePack...`);

                    await require(`./build/beforePack.js`)(config);
        
                    fs.writeFileSync(`./build.json`, JSON.stringify(config, null, 4));
                    
                    console.log(`Wrote config!`);
                    
                    console.log(`Spawning npm at ${npm}`);
        
                    const procArgs = [`run`, `electron-builder`, `--`, `-c`, `./build.json`, ...(process.argv.find(s => s == `pack`) ? [`--dir`] : []), ...(config.publish ? [`-p`, `always`] : [`-p`, `never`])]
        
                    console.log(`Spawning npm with args "${procArgs.join(` `)}"`);
                    
                    const proc = child_process.spawn(npm, procArgs, { stdio: "inherit", shell: true });
                    
                    proc.on(`close`, async (code) => {
                        console.log(`Build closed with code ${code}`);

                        console.log(`Running afterPack`);

                        await require(`./build/afterPack.js`)(config);
                    
                        if(fs.existsSync(`./build.json`)) fs.unlinkSync(`./build.json`);
                    })
                } else {
                    console.log(`Not packing (nopack arg sent)`);
                    process.exit(0);
                }
            }
        })
    })
} else {
    module.exports = { config, getFullMetadata: () => getFullMetadata() };
}