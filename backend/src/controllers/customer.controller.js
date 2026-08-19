const customerService = require("../services/customer.service");
const customerValidator = require("../validators/customer.validator");
const ApiResponse = require("../helpers/apiResponse");

class CustomerController {
  async create(req, res, next) {
    try {
      const { error } = customerValidator.create(req.body);

      if (error) {
        return ApiResponse.error(res, error.details[0].message, 400);
      }

      const customer = await customerService.createCustomer(
        req.user.companyId,
        req.body
      );

      return ApiResponse.success(
        res,
        "Customer created successfully",
        customer,
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
      status: req.query.status,
      country: req.query.country,
    };

    const customers = await customerService.getAllCustomers(
      req.user.companyId,
      page,
      limit,
      sortBy,
      order,
      filters
    );

    return ApiResponse.success(
      res,
      "Customers fetched successfully",
      customers
    );
  } catch (error) {
    next(error);
  }
}

  async getById(req, res, next) {
    try {
      const customer = await customerService.getCustomerById(
        req.user.companyId,
        req.params.id
      );

      return ApiResponse.success(
        res,
        "Customer fetched successfully",
        customer
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { error } = customerValidator.create(req.body);

      if (error) {
        return ApiResponse.error(res, error.details[0].message, 400);
      }

      const customer = await customerService.updateCustomer(
        req.user.companyId,
        req.params.id,
        req.body
      );

      return ApiResponse.success(
        res,
        "Customer updated successfully",
        customer
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await customerService.deleteCustomer(
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

  async restore(req, res, next) {
    try {
      const customer = await customerService.restoreCustomer(
        req.user.companyId,
        req.params.id
      );

      return ApiResponse.success(
        res,
        "Customer restored successfully",
        customer
      );
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const customers = await customerService.searchCustomers(
        req.user.companyId,
        req.query.q
      );

      return ApiResponse.success(
        res,
        "Customers fetched successfully",
        customers
      );
    } catch (error) {
      next(error);
    }
  }

  async dashboard(req, res, next) {
  try {
    const stats = await customerService.getDashboardStats(
      req.user.companyId
    );

    return ApiResponse.success(
      res,
      "Dashboard statistics fetched successfully",
      stats
    );
  } catch (error) {
    next(error);
  }
}

async bulkDelete(req, res, next) {
  try {
    const result = await customerService.bulkDeleteCustomers(
      req.user.companyId,
      req.body.customerIds
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

async bulkRestore(req, res, next) {
  try {
    const result = await customerService.bulkRestoreCustomers(
      req.user.companyId,
      req.body.customerIds
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

async bulkStatusUpdate(req, res, next) {
  try {
    const result = await customerService.bulkStatusUpdate(
      req.user.companyId,
      req.body.customerIds,
      req.body.status
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

async exportCustomers(req, res, next) {
  try {
    const excelBuffer = await customerService.exportCustomers(
      req.user.companyId
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=customers_${Date.now()}.xlsx`
    );

    return res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}

async downloadTemplate(req, res, next) {
  try {
    const excelBuffer = await customerService.downloadTemplate();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="customer_import_template.xlsx"'
    );

    return res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}

async importCustomers(req, res, next) {
  try {
    if (!req.file) {
      return ApiResponse.error(
        res,
        "Excel file is required",
        400
      );
    }

    const result = await customerService.importCustomers(
      req.user.companyId,
      req.file.buffer
    );

    return ApiResponse.success(
      res,
      "Customers imported successfully",
      result
    );
  } catch (error) {
    next(error);
  }
}


// =====================================
// Customer Campaign History
// =====================================
async getHistory(req, res, next) {
  try {
    const history = await customerService.getCustomerHistory(
      req.user.companyId,
      req.params.id
    );

    return ApiResponse.success(
      res,
      "Customer history fetched successfully",
      history
    );
  } catch (error) {
    next(error);
  }
}
}

module.exports = new CustomerController();