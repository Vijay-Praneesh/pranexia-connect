const XLSX = require("xlsx");
const customerRepository = require("../repositories/customer.repository");
const { readExcel, writeExcel } = require("../utils/excel.utils");
const AppError = require("../utils/appError");
const planService = require("./plan.service");
const { METRIC_KEYS } = require("../config/plans.config");

class CustomerService {
  // =====================================
  // Create Customer
  // =====================================
  async createCustomer(companyId, customerData) {
    // Enforce Plan Customer Limit
    await planService.assertWithinLimit(companyId, METRIC_KEYS.CUSTOMERS, 1);

    // Check duplicate mobile number within the company
    const existingCustomer = await customerRepository.findByMobile(
      companyId,
      customerData.mobile
    );

    if (existingCustomer) {
      throw new AppError("Customer with this mobile number already exists", 409);
    }

    return await customerRepository.create({
      ...customerData,
      companyId,
    });
  }

  // =====================================
  // Get All Customers
  // =====================================
  async getAllCustomers(
    companyId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "DESC",
    filters = {}
  ) {
    const result = await customerRepository.findAll(
      companyId,
      page,
      limit,
      sortBy,
      order,
      filters
    );

    return {
      customers: result.rows,
      pagination: {
        page,
        limit,
        totalRecords: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    };
  }

  // =====================================
  // Get Customer By ID
  // =====================================
  async getCustomerById(companyId, customerId) {
    const customer = await customerRepository.findById(
      companyId,
      customerId
    );

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    return customer;
  }

  // =====================================
  // Update Customer
  // =====================================
  async updateCustomer(companyId, customerId, customerData) {
    // Check if customer exists
    const customer = await customerRepository.findById(
      companyId,
      customerId
    );

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    // Check duplicate mobile number
    if (
      customerData.mobile &&
      customerData.mobile !== customer.mobile
    ) {
      const existingMobile = await customerRepository.findByMobile(
        companyId,
        customerData.mobile
      );

      if (existingMobile) {
        throw new AppError(
          "Customer with this mobile number already exists",
          409
        );
      }
    }

    // Check duplicate email
    if (
      customerData.email &&
      customerData.email !== customer.email
    ) {
      const existingEmail = await customerRepository.findByEmail(
        companyId,
        customerData.email
      );

      if (existingEmail) {
        throw new AppError(
          "Customer with this email already exists",
          409
        );
      }
    }

    return await customerRepository.update(
      companyId,
      customerId,
      customerData
    );
  }

  // =====================================
  // Delete Customer (Soft Delete)
  // =====================================
  async deleteCustomer(companyId, customerId) {
    const customer = await customerRepository.findById(
      companyId,
      customerId
    );

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    await customerRepository.delete(
      companyId,
      customerId
    );

    return {
      message: "Customer deleted successfully",
    };
  }

  // =====================================
  // Restore Soft-Deleted Customer
  // =====================================
  async restoreCustomer(companyId, customerId) {
    const customer =
      await customerRepository.findDeletedById(
        companyId,
        customerId
      );

    if (!customer) {
      throw new AppError("Deleted customer not found", 404);
    }

    // Check if restoring would violate active mobile uniqueness
    const activeDuplicate = await customerRepository.findByMobile(
      companyId,
      customer.mobile
    );

    if (activeDuplicate) {
      throw new AppError(
        "An active customer with this mobile number already exists",
        409
      );
    }

    await customerRepository.restore(
      companyId,
      customerId
    );

    return {
      message: "Customer restored successfully",
    };
  }

  // =====================================
  // Permanently Delete Customer
  // =====================================
  async forceDeleteCustomer(companyId, customerId) {
    const customer =
      await customerRepository.findDeletedById(
        companyId,
        customerId
      );

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    await customerRepository.forceDelete(
      companyId,
      customerId
    );

    return {
      message: "Customer permanently deleted",
    };
  }

  // =====================================
  // Search Customers
  // =====================================
  async searchCustomers(companyId, keyword) {
    if (!keyword || keyword.trim() === "") {
      throw new AppError("Search keyword is required", 400);
    }

    return await customerRepository.search(
      companyId,
      keyword.trim()
    );
  }

  // =====================================
  // Dashboard Statistics
  // =====================================
  async getDashboardStats(companyId) {
    return await customerRepository.getDashboardStats(companyId);
  }

  // =====================================
  // Bulk Delete Customers
  // =====================================
  async bulkDeleteCustomers(companyId, customerIds) {
    if (!customerIds || customerIds.length === 0) {
      throw new AppError("Customer IDs are required", 400);
    }

    await customerRepository.bulkDelete(
      companyId,
      customerIds
    );

    return {
      message: "Customers deleted successfully",
    };
  }

  // =====================================
  // Bulk Restore Customers
  // =====================================
  async bulkRestoreCustomers(companyId, customerIds) {
    if (!customerIds || customerIds.length === 0) {
      throw new AppError("Customer IDs are required", 400);
    }

    await customerRepository.bulkRestore(
      companyId,
      customerIds
    );

    return {
      message: "Customers restored successfully",
    };
  }

  // =====================================
  // Bulk Status Update
  // =====================================
  async bulkStatusUpdate(
    companyId,
    customerIds,
    status
  ) {
    if (!customerIds || customerIds.length === 0) {
      throw new AppError("Customer IDs are required", 400);
    }

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    await customerRepository.bulkStatusUpdate(
      companyId,
      customerIds,
      status
    );

    return {
      message: "Customer status updated successfully",
    };
  }

  // =====================================
  // Export Customers
  // =====================================
  async exportCustomers(companyId) {
    const customers =
      await customerRepository.getAllForExport(companyId);

    const exportData = customers.map((customer) => ({
      "First Name": customer.firstName,
      "Last Name": customer.lastName,
      Mobile: customer.mobile,
      Email: customer.email,
      Country: customer.country,
      Status: customer.status,
      Notes: customer.notes || "",
      "Created At": customer.createdAt,
    }));

    return writeExcel(exportData, "Customers");
  }

  // =====================================
  // Download Import Template
  // =====================================
  async downloadTemplate() {
    const templateData = [
      {
        "First Name": "John",
        "Last Name": "Doe",
        Mobile: "9876543210",
        Email: "john@example.com",
        Country: "India",
        Status: "ACTIVE",
        Notes: "Sample Customer",
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(templateData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Customer Template"
    );

    return XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
  }

  // =====================================
  // Import Customers
  // =====================================
  async importCustomers(companyId, fileBuffer) {
    const rows = readExcel(fileBuffer);

    if (!rows.length) {
      throw new AppError("Excel file is empty", 400);
    }

    const customers = [];
    const errors = [];

    // Track duplicates inside uploaded Excel
    const mobileSet = new Set();
    const emailSet = new Set();

    let rowNumber = 2;

    for (const row of rows) {
      // Required fields
      if (!row["First Name"] || !row["Mobile"]) {
        errors.push({
          row: rowNumber,
          reason: "First Name and Mobile are required",
        });

        rowNumber++;
        continue;
      }

      // Status validation
      const status = (
        row["Status"] || "ACTIVE"
      ).toUpperCase();

      if (!["ACTIVE", "BLOCKED"].includes(status)) {
        errors.push({
          row: rowNumber,
          reason:
            "Invalid status. Use ACTIVE or BLOCKED",
        });

        rowNumber++;
        continue;
      }

      // Duplicate mobile inside Excel
      if (mobileSet.has(row["Mobile"])) {
        errors.push({
          row: rowNumber,
          reason: "Duplicate mobile found in Excel",
        });

        rowNumber++;
        continue;
      }

      mobileSet.add(row["Mobile"]);

      // Duplicate email inside Excel
      if (row["Email"]) {
        if (emailSet.has(row["Email"])) {
          errors.push({
            row: rowNumber,
            reason: "Duplicate email found in Excel",
          });

          rowNumber++;
          continue;
        }

        emailSet.add(row["Email"]);
      }

      // Duplicate mobile in database
      const existingMobile =
        await customerRepository.findByMobile(
          companyId,
          row["Mobile"]
        );

      if (existingMobile) {
        errors.push({
          row: rowNumber,
          reason: "Mobile already exists",
        });

        rowNumber++;
        continue;
      }

      // Duplicate email in database
      if (row["Email"]) {
        const existingEmail =
          await customerRepository.findByEmail(
            companyId,
            row["Email"]
          );

        if (existingEmail) {
          errors.push({
            row: rowNumber,
            reason: "Email already exists",
          });

          rowNumber++;
          continue;
        }
      }

      customers.push({
        companyId,
        firstName: row["First Name"],
        lastName: row["Last Name"] || null,
        mobile: row["Mobile"],
        email: row["Email"] || null,
        country: row["Country"] || "India",
        status,
        notes: row["Notes"] || null,
      });

      rowNumber++;
    }

    if (customers.length > 0) {
      await planService.assertWithinLimit(
        companyId,
        METRIC_KEYS.CUSTOMERS,
        customers.length
      );
      await customerRepository.bulkCreate(customers);
    }

    return {
      imported: customers.length,
      skipped: errors.length,
      errors,
    };
  }

  // =====================================
  // Customer Campaign History
  // =====================================
  async getCustomerHistory(
    companyId,
    customerId
  ) {
    const customer =
      await customerRepository.findById(
        companyId,
        customerId
      );

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    const history =
      await customerRepository.getHistory(
        companyId,
        customerId
      );

    return {
      customer,
      history,
    };
  }
}

module.exports = new CustomerService();
