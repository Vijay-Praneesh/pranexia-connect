const templateRepository = require("../repositories/template.repository");
const AppError = require("../utils/appError");
const whatsappRepository = require("../repositories/whatsapp.repository");
const metaTemplateService = require("./metaTemplate.service");
const planService = require("./plan.service");
const { METRIC_KEYS } = require("../config/plans.config");

const statusMap = { APPROVED: "APPROVED", PENDING: "PENDING", REJECTED: "REJECTED", PAUSED: "PAUSED", DISABLED: "DISABLED" };
const extractVariables = (body = "") => [...new Set((body.match(/\{\{\d+\}\}/g) || []))].map((value) => Number(value.slice(2, -2))).sort((a, b) => a - b);
const metaToLocal = (item) => {
  const components = item.components || [];
  const header = components.find((component) => component.type === "HEADER");
  const body = components.find((component) => component.type === "BODY");
  const footer = components.find((component) => component.type === "FOOTER");
  const buttons = components.find((component) => component.type === "BUTTONS");
  return { metaTemplateId: item.id ? String(item.id) : null, metaTemplateName: item.name, name: item.name, language: item.language, category: item.category, status: statusMap[item.status] || "UNKNOWN", metaStatus: item.status || "UNKNOWN", headerType: header?.format || "NONE", headerText: header?.text || null, body: body?.text || "", footer: footer?.text || null, buttons: buttons?.buttons || null, components, variables: extractVariables(body?.text), rejectionReason: item.rejected_reason || item.rejection_reason || null, syncedAt: new Date() };
};

class TemplateService {
  async connection(companyId) {
    const connection = await whatsappRepository.findByCompanyId(companyId);
    if (!connection || connection.status !== "CONNECTED") throw new AppError("Connect your WhatsApp Business account before managing templates.", 409);
    return connection;
  }
  async createTemplate(companyId, templateData) {
    // Enforce Plan Template Limit
    await planService.assertWithinLimit(companyId, METRIC_KEYS.TEMPLATES, 1);

    const connection = await this.connection(companyId);
    const existingTemplate = await templateRepository.findByName(
      companyId,
      templateData.name
    );

    if (existingTemplate) {
      throw new AppError("Template name already exists", 409);
    }

    const components = templateData.components || this.toMetaComponents(templateData);
    this.validateVariables(components);
    const response = await metaTemplateService.createTemplate(connection, { name: templateData.name, language: templateData.language, category: templateData.category, components });
    return await templateRepository.upsertFromMeta(companyId, metaToLocal({ id: response.id, name: templateData.name, language: templateData.language, category: templateData.category, status: response.status || "PENDING", components }));
  }

  toMetaComponents(data) {
    const components = [{ type: "BODY", text: data.body }];
    if (data.headerType === "TEXT") components.unshift({ type: "HEADER", format: "TEXT", text: data.headerText });
    else if (data.headerType && data.headerType !== "NONE") components.unshift({ type: "HEADER", format: data.headerType });
    if (data.footer) components.push({ type: "FOOTER", text: data.footer });
    if (data.buttons?.length) components.push({ type: "BUTTONS", buttons: data.buttons });
    return components;
  }
  validateVariables(components) {
    for (const component of components) {
      const values = extractVariables(component.text);
      if (values.some((value, index) => value !== index + 1)) throw new AppError("Template variables must be consecutive, starting at {{1}}", 400);
    }
  }
  async syncTemplates(companyId) {
    const connection = await this.connection(companyId);
    const response = await metaTemplateService.listTemplates(connection);
    const templates = [];
    for (const item of response.data || []) templates.push(await templateRepository.upsertFromMeta(companyId, metaToLocal(item)));
    return { templates, synchronized: templates.length };
  }

  async getAllTemplates(
    companyId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "DESC",
    filters = {}
  ) {
    const result = await templateRepository.findAll(
      companyId,
      page,
      limit,
      sortBy,
      order,
      filters
    );

    return {
      templates: result.rows,
      pagination: {
        page,
        limit,
        totalRecords: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    };
  }

  async getTemplateById(companyId, templateId) {
    const template = await templateRepository.findById(
      companyId,
      templateId
    );

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    return template;
  }

  async updateTemplate(companyId, templateId, templateData) {
    const template = await templateRepository.findById(
      companyId,
      templateId
    );

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    if (
      templateData.name &&
      templateData.name !== template.name
    ) {
      const existingTemplate = await templateRepository.findByName(
        companyId,
        templateData.name
      );

      if (existingTemplate) {
        throw new AppError("Template name already exists", 409);
      }
    }

    throw new AppError("Meta template edits are not supported by this API. Create a replacement template and synchronize its approval status.", 409);
  }

  async deleteTemplate(companyId, templateId) {
    const template = await templateRepository.findById(
      companyId,
      templateId
    );

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    throw new AppError("Meta template deletion is not exposed until the configured Graph API capability is verified.", 409);
  }

  async searchTemplates(companyId, keyword) {
    if (!keyword || keyword.trim() === "") {
      throw new AppError("Search keyword is required", 400);
    }

    return await templateRepository.search(
      companyId,
      keyword.trim()
    );
  }
}

module.exports = new TemplateService();
