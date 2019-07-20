// Requires FS.
const fs = require("fs").promises

// Handles templates.
module.exports = async (templatePath, domain) => {
    const data = (await fs.readFile(templatePath)).toString().replace(/{domain}/g, domain)
    return JSON.parse(data)
}
