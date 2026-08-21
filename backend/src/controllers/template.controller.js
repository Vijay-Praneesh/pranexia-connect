const templateService = require("../services/template.service");
const ApiResponse = require("../helpers/apiResponse");
const validator = require("../validators/resource.validator");

class TemplateController {
  async create(req, res, next) {
    try {
      const { error } = validator.templateCreate(req.body);
      if (error) return ApiResponse.error(res, error.details[0].message, 400);
      const template = await templateService.createTemplate(
        req.user.companyId,
        req.body
      );

      return ApiResponse.success(
        res,
        "Template created successfully",
        template,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order || "DESC";

      const filters = {
        category: req.query.category,
        status: req.query.status,
        language: req.query.language,
      };

      const templates = await templateService.getAllTemplates(
        req.user.companyId,
        page,
        limit,
        sortBy,
        order,
        filters
      );

      return ApiResponse.success(
        res,
        "Templates fetched successfully",
        templates
      );
    } catch (error) {
      next(error);
    }
  }

async getById(req, res, next) {
  try {
    const template = await templateService.getTemplateById(
      req.user.companyId,
      req.params.id
    );

    return ApiResponse.success(
      res,
      "Template fetched successfully",
      template
    );
  } catch (error) {
    next(error);
  }
}

  async update(req, res, next) {
    try {
      const { error } = validator.templateUpdate(req.body);
      if (error) return ApiResponse.error(res, error.details[0].message, 400);
      const template = await templateService.updateTemplate(
        req.user.companyId,
        req.params.id,
        req.body
      );

      return ApiResponse.success(
        res,
        "Template updated successfully",
        template
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await templateService.deleteTemplate(
        req.user.companyId,
        req.params.id
      );

      return ApiResponse.success(
        res,
        result.message,
        null
      );
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const keyword = req.query.keyword || req.query.q || "";

      const templates = await templateService.searchTemplates(
        req.user.companyId,
        keyword
      );

      return ApiResponse.success(
        res,
        "Templates fetched successfully",
        templates
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TemplateController();
