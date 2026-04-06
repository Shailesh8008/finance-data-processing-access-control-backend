const express = require("express");
const request = require("supertest");

describe("user controller", () => {
  let userModel;
  let recordModel;
  let summaryModel;
  let bcrypt;
  let jwt;
  let userController;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET_KEY = "test-secret";
    process.env.ENV = "test";

    userModel = jest.fn();
    userModel.findOne = jest.fn();
    userModel.findByIdAndUpdate = jest.fn();

    recordModel = {
      findById: jest.fn(),
      aggregate: jest.fn(),
    };

    summaryModel = {
      findOne: jest.fn(),
    };

    bcrypt = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    jwt = {
      sign: jest.fn(),
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
    jest.doMock("bcrypt", () => bcrypt);
    jest.doMock("jsonwebtoken", () => jwt);

    userController = require("../../dist/controller/user").default;
  });

  function createApp(configure) {
    const app = express();
    app.use(express.json());
    configure(app);
    return app;
  }

  test("register creates a user with hashed password", async () => {
    userModel.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    const save = jest.fn().mockResolvedValue(undefined);
    userModel.mockImplementation(function MockUser(data) {
      Object.assign(this, data);
      this.save = save;
    });

    const app = createApp((appInstance) => {
      appInstance.post("/register", userController.register);
    });

    const response = await request(app)
      .post("/register")
      .send({ username: "john", email: "john@example.com", password: "secret123" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: "User registered successfully" });
    expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@example.com" });
    expect(bcrypt.hash).toHaveBeenCalledWith("secret123", 10);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("register rejects duplicate email", async () => {
    userModel.findOne.mockResolvedValue({ _id: "existing-user" });

    const app = createApp((appInstance) => {
      appInstance.post("/register", userController.register);
    });

    const response = await request(app)
      .post("/register")
      .send({ username: "john", email: "john@example.com", password: "secret123" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: "Conflict (email already exists)" });
  });

  test("login sets auth cookie and returns user payload", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    userModel.findOne.mockResolvedValue({
      _id: { toString: () => "user-id-1" },
      email: "john@example.com",
      role: "user",
      password: "hashed-password",
      save,
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("signed-token");

    const app = createApp((appInstance) => {
      appInstance.post("/login", userController.login);
    });

    const response = await request(app)
      .post("/login")
      .send({ email: "john@example.com", password: "secret123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Login Successfully!",
      user: {
        id: "user-id-1",
        email: "john@example.com",
        role: "user",
      },
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: "user-id-1", email: "john@example.com", role: "user" },
      "test-secret",
      { expiresIn: "7d" },
    );
    expect(response.headers["set-cookie"][0]).toContain("token=signed-token");
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("getOneRecord validates record id length", async () => {
    const app = createApp((appInstance) => {
      appInstance.get("/record/:recordId", userController.getOneRecord);
    });

    const response = await request(app).get("/record/short-id");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid id");
    expect(recordModel.findById).not.toHaveBeenCalled();
  });

  test("myRecords returns 404 when the user has no records", async () => {
    recordModel.aggregate.mockResolvedValue([]);

    const app = createApp((appInstance) => {
      appInstance.use((req, res, next) => {
        req.user = { id: "user-1", role: "user" };
        next();
      });
      appInstance.get("/my-records", userController.myRecords);
    });

    const response = await request(app).get("/my-records");

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("cannot find any record associated to userId: user-1");
  });

  test("mySummary returns summary for the authenticated user", async () => {
    summaryModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        totalIncome: 1000,
        totalExpense: 200,
        netBalance: 800,
        categoryWise: [{ category: "salary", total: 1000 }],
        RecentActivity: [{ amount: 1000 }],
        monthlyTrends: [{ month: "Apr", total: 1000 }],
        weeklyTrends: [{ week: 14, total: 1000 }],
        yearlyTrends: [{ year: 2026, total: 1000 }],
      }),
    });

    const app = createApp((appInstance) => {
      appInstance.use((req, res, next) => {
        req.user = { id: "user-1", role: "user" };
        next();
      });
      appInstance.get("/my-summary", userController.mySummary);
    });

    const response = await request(app).get("/my-summary");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      summary: {
        totalIncome: 1000,
        totalExpense: 200,
        netBalance: 800,
        categoryWise: [{ category: "salary", total: 1000 }],
        RecentActivity: [{ amount: 1000 }],
        monthlyTrends: [{ month: "Apr", total: 1000 }],
        weeklyTrends: [{ week: 14, total: 1000 }],
        yearlyTrends: [{ year: 2026, total: 1000 }],
      },
    });
  });
});
