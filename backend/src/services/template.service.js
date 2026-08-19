const templateRepository = require("../repositories/template.repository");

class TemplateService {
  async createTemplate(companyId, templateData) {
    const existingTemplate = await templateRepository.findByName(
      companyId,
      templateData.name
    );

    if (existingTemplate) {
      throw new Error("Template name already exists");
    }

    return await templateRepository.create({
      ...templateData,
      companyId,
    });
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
      throw new Error("Template not found");
    }

    return template;
  }

  async updateTemplate(companyId, templateId, templateData) {
    const template = await templateRepository.findById(
      companyId,
      templateId
    );

    if (!template) {
      throw new Error("Template not found");
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
        throw new Error("Template name already exists");
      }
    }

    await templateRepository.update(
      companyId,
      templateId,
      templateData
    );

    return await templateRepository.findById(
      companyId,
      templateId
    );
  }

  async deleteTemplate(companyId, templateId) {
    const template = await templateRepository.findById(
      companyId,
      templateId
    );

    if (!template) {
      throw new Error("Template not found");
    }

    await templateRepository.delete(companyId, templateId);

    return {
      message: "Template deleted successfully",
    };
  }

  async searchTemplates(companyId, keyword) {
    if (!keyword || keyword.trim() === "") {
      throw new Error("Search keyword is required");
    }

    return await templateRepository.search(
      companyId,
      keyword.trim()
    );
  }
}

module.exports = new TemplateService();