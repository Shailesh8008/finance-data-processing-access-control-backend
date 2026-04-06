const express = require("express");
const request = require("supertest");

describe("admin controller", () => {
  let userModel;
  let recordModel;
  let summaryModel;
  let adminController;

  beforeEach(() => {
    jest.resetModules();

    userModel = {
      aggregate: jest.fn(),
      findById: jest.fn(),
    };

    recordModel = jest.fn();
    recordModel.aggregate = jest.fn();
    recordModel.findById = jest.fn();
    recordModel.findByIdAndDelete = jest.fn();

    summaryModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    jest.doMock("../../dist/model/user", () => ({
      __esModule: true,
      default: userModel,
    }));
    jest.doMock("../../dist/model/record", () => ({
      __esModule: true,
      default: recordModel,
    }));
    jest.doMock("../../dist/model/summary", () => ({
      __esModule: true,
      default: summaryModel,
    }));

    adminController = require("../../dist/controller/admin").default;
  });

  function createApp(configure) {
    const app = express();
    app.use(express.json());
    configure(app);
    return app;
  }

  test("getAllUsers returns projected users", async () => {
    userModel.aggregate.mockResolvedValue([
      { id: "user-1", username: "john", email: "john@example.com" },
    ]);

    const app = createApp((appInstance) => {
      appInstance.get("/users", adminController.getAllUsers);
    });

    const response = await request(app).get("/users");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      users: [{ id: "user-1", username: "john", email: "john@example.com" }],
    });
    expect(userModel.aggregate).toHaveBeenCalledTimes(1);
  });

  test("getAllRecords returns aggregated records with the current pagination artifacts", async () => {
    recordModel.aggregate.mockResolvedValue([
      {
        id: "record-1",
        userId: "user-1",
        amount: 250,
        type: "expense",
        category: "food",
        description: "Lunch",
        createdBy: "admin-1",
      },
    ]);

    const app = createApp((appInstance) => {
      appInstance.get("/records", adminController.getAllRecords);
    });

    const response = await request(app)
      .get("/records")
      .query({ type: "expense", category: "food", page: 2, limit: 5 });

    expect(response.status).toBe(200);
    expect(recordModel.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { $match: { type: "expense", category: "food" } },
        { $sort: { _id: -1 } },
      ]),
    );
    expect(response.body.records).toEqual([
      {
        id: "record-1",
        userId: "user-1",
        amount: 250,
        type: "expense",
        category: "food",
        description: "Lunch",
        createdBy: "admin-1",
      },
      { $skip: 5 },
      { $limit: 5 },
    ]);
  });

  test("createRecord validates target user existence and saves a record", async () => {
    userModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "user-id-1" }),
    });
    const save = jest.fn().mockResolvedValue(undefined);
    recordModel.mockImplementation(function MockRecord(data) {
      Object.assign(this, data);
      this.save = save;
    });
    recordModel.aggregate.mockResolvedValue([
      {
        totals: [{ totalIncome: 1500, totalExpense: 0 }],
        categoryWise: [{ category: "salary", total: 1500 }],
        recentActivity: [{ amount: 1500 }],
        monthlyTrends: [{ month: "Apr", total: 1500 }],
        weeklyTrends: [{ week: 14, total: 1500 }],
        yearlyTrends: [{ year: 2026, total: 1500 }],
      },
    ]);
    summaryModel.findOneAndUpdate.mockResolvedValue({});

    const app = createApp((appInstance) => {
      appInstance.use((req, res, next) => {
        req.user = { id: "admin-1", role: "admin" };
        next();
      });
      appInstance.post("/create-record", adminController.createRecord);
    });

    const response = await request(app).post("/create-record").send({
      userId: "507f191e810c19729de860ea",
      amount: 1500,
      type: "income",
      date: "2026-04-06",
      category: "salary",
      description: "Monthly salary",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: "Record created successfully!" });
    expect(save).toHaveBeenCalledTimes(1);
    expect(summaryModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "507f191e810c19729de860ea" },
      expect.objectContaining({
        userId: "507f191e810c19729de860ea",
        totalIncome: 1500,
        totalExpense: 0,
        netBalance: 1500,
      }),
      { upsert: true, new: true },
    );
  });

  test("updateRecord returns 404 when the record does not exist", async () => {
    recordModel.findById.mockResolvedValue(null);

    const app = createApp((appInstance) => {
      appInstance.use((req, res, next) => {
        req.user = { id: "admin-1", role: "admin" };
        next();
      });
      appInstance.post("/update-record/:id", adminController.updateRecord);
    });

    const response = await request(app)
      .post("/update-record/507f191e810c19729de860ea")
      .send({ amount: 1800 });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("cannot find record with the id");
  });

  test("deleteRecord removes a record by id", async () => {
    recordModel.findByIdAndDelete.mockResolvedValue({ _id: "record-1" });

    const app = createApp((appInstance) => {
      appInstance.delete("/delete-record/:id", adminController.deleteRecord);
    });

    const response = await request(app).delete(
      "/delete-record/507f191e810c19729de860ea",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Deleted Successfully!" });
    expect(recordModel.findByIdAndDelete).toHaveBeenCalledWith(
      "507f191e810c19729de860ea",
    );
  });

  test("summary returns 404 when no summary exists for the user", async () => {
    summaryModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const app = createApp((appInstance) => {
      appInstance.get("/summary/:userId", adminController.summary);
    });

    const response = await request(app).get("/summary/507f191e810c19729de860ea");

    expect(response.status).toBe(404);
    expect(response.body.message).toContain(
      "cannot find summary associated to userId: 507f191e810c19729de860ea",
    );
  });
});
