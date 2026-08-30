const companyService = require("../services/company.service");
const ApiResponse = require("../helpers/apiResponse");
const authValidator = require("../validators/auth.validator");

class CompanyController {
  // =====================================
  // Get all client companies
  // =====================================
  async getAll(req, res, next) {
    try {
      const companies = await companyService.getAllCompanies(
        req.query
      );

      return ApiResponse.success(
        res,
        "Companies fetched successfully",
        companies
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // Get company by ID
  // =====================================
  async getById(req, res, next) {
    try {
      const company = await companyService.getCompanyById(
        req.params.id
      );

      return ApiResponse.success(
        res,
        "Company fetched successfully",
        company
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // Create client company
  // =====================================
async create(req, res, next) {
  try {
    const { error } = authValidator.clientCreate(req.body);

    if (error) {
      return ApiResponse.error(
        res,
        error.details.map((item) => item.message).join(", "),
        400
      );
    }

    const company = await companyService.createCompany(
      req.body
    );

    return ApiResponse.success(
      res,
      "Client company created successfully",
      company,
      201
    );
  } catch (error) {
    next(error);
  }
}

  // =====================================
  // Update company
  // =====================================
  async update(req, res, next) {
    try {
      const company = await companyService.updateCompany(
        req.params.id,
        req.body
      );

      return ApiResponse.success(
        res,
        "Company updated successfully",
        company
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // Activate / Deactivate company
  // =====================================
  async updateStatus(req, res, next) {
    try {
      const company = await companyService.updateCompanyStatus(
        req.params.id,
        req.body.status
      );

      return ApiResponse.success(
        res,
        "Company status updated successfully",
        company
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CompanyController();