(async() => {
    // Require stuff.
    const getDigitalOceanConfig = require("./doks_handler")
    const Request = require("kubernetes-client/backends/request")
    const Client = require("kubernetes-client").Client
    const express = require("express")
    const { domainValid, dnsValid } = require("./domain_validation")
    const templateHandler = require("./template_handler")

    // Handles creating/refreshing the client.
    let client
    const renew = async() => {
        const kubeconfig = await getDigitalOceanConfig()
        const backend = new Request({ kubeconfig })
        client = new Client({ backend, version: "1.9" })
        await client.loadSpec()
        const crds = (await client.apis["apiextensions.k8s.io"].v1beta1.customresourcedefinitions.get()).body.items
        for (const crd of crds) {
            if (crd.metadata.name === "certificates.certmanager.k8s.io") {
                client.addCustomResourceDefinition(crd)
            }
        }
    }
    await renew()
    setInterval(renew, 100000000)

    // Checks if a domain is already in the cluster.
    const domainAlreadyInCluster = async domain => {
        for (const item of (await client.apis["certmanager.k8s.io"].v1alpha1.certificate.get()).body.items) {
            if (item.spec.dnsNames) {
                if (item.spec.dnsNames.includes(domain)) {
                    return true
                }
            }
        }
        return false
    }

    // Sets up the domain.
    const setupDomain = async domain => {
        const certificate = await templateHandler("./kube_templates/certificate.json", domain)
        const ingress = await templateHandler("./kube_templates/ingress.json", domain)

        await client.apis["certmanager.k8s.io"].v1alpha1.namespaces("default").certificates.post({body: certificate})
        await client.apis.extensions.v1beta1.namespaces("default").ingresses.post({body: ingress})
    }

    // Defines the express app.
    const app = express()
    app.get("/", async (req, res) => {
        const domain = req.query.domain ? req.query.domain.toLowerCase() : null
        if (!domain) {
            res.json({
                success: false,
                message: "No domain found.",
            })
            res.status(400)
        } else if (await domainAlreadyInCluster(domain)) {
            res.json({
                success: false,
                message: "Domain is already in cluster.",
            })
            res.status(403)
        } else if (!await domainValid(domain)) {
            res.json({
                success: false,
                message: "Domain is invalid.",
            })
            res.status(403)
        } else if (!await dnsValid(domain)) {
            res.json({
                success: false,
                message: `The CNAME record for the domain must point to ${process.env.CLUSTER_CNAME}.`,
            })
            res.status(403)
        } else {
            await setupDomain(domain)
            res.json({
                success: true,
            })
        }
    })
    app.listen(8000, "0.0.0.0", () => console.log("Listening on port 8000."))
})()
