// Requires fetch.
const fetch = require("node-fetch")

// Defines if the domain is valid.
const domainValid = async domain => {
    const res = await fetch(
        `https://whoisjs.com/api/v1/${domain}`
    )
    if (!res.ok || !(await res.json()).success) {
        return false
    }
    return true
}

// Defines if the DNS is valid.
const dnsValid = async domain => {
    const dnsLookup = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
        {
            headers: {
                accept: "application/dns-json",
            },
        }
    )
    if (!dnsLookup.ok) {
        return false
    }
    const json = await dnsLookup.json()
    if (!json.Answer) {
        return false
    }
    const first = json.Answer[0]
    return first.data === process.env.CLUSTER_IP
}

// Exports the functions.
module.exports = { domainValid, dnsValid }
