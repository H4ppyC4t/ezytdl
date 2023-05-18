global.tests = {};

module.exports = () => new Promise(async (res, rej) => {
    const info = global.tests[`getInfo`];

    require(`../../util/ytdlp`).download({
        url: process.env[`TEST-LINK`],
        format: `bv*+ba/b`,
        ext: `mp4`,
        filePath: null,
        info: Object.assign({}, info, { formats: null }),
    }, () => {}).then(res).catch(rej)
})