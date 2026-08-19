const axios = require("axios");

class WhatsAppService {
    constructor() {
        this.apiVersion = process.env.WHATSAPP_API_VERSION;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    }

    async sendTemplateMessage({ to, templateName, languageCode = "en_US", components = [] }) {
        try {
            const payload = {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: languageCode,
                    },
                    components,
                },
            };

            const response = await axios.post(this.baseUrl, payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            return response.data;
        } catch (error) {
            const message =
                error.response?.data?.error?.message || error.message;

            throw new Error(`WhatsApp API Error: ${message}`);
        }
    }
}

module.exports = new WhatsAppService();