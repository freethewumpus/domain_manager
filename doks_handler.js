const fetch = require("node-fetch")
const { KubeConfig } = require("kubernetes-client")

module.exports = async() => {
    const config = new KubeConfig()
    const doksRes = await fetch(
        `https://api.digitalocean.com/v2/kubernetes/clusters/${process.env.CLUSTER_ID}/kubeconfig`,
        {
            headers: {
                Authorization: `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
                "Content-Type": "application/json",
            },
        }
    )
    if (!doksRes.ok) {
        throw new Error(`DigitalOcean returned a ${doksRes.status}.`)
    }
    config.loadFromString(await doksRes.text())
    return config
}
