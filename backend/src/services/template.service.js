const templateRepository = require("../repositories/template.repository");
const AppError = require("../utils/appError");

class TemplateService {
  async createTemplate(companyId, templateData) {
    const existingTemplate = await templateRepository.findByName(
      companyId,
      templateData.name
    );

    if (existingTemplate) {
      throw new AppError("Template name already exists", 409);
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
      throw new AppError("Template not found", 404);
    }

    await templateRepository.delete(companyId, templateId);

    return {
      message: "Template deleted successfully",
    };
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
