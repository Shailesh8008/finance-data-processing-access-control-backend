import { Request, Response } from "express";
import userModel from "../model/user";
import recordModel from "../model/record";
import dayjs from "dayjs";
import { MyJwtPayload } from "../types/auth";
import summaryModel from "../model/summary";
import { RecordType } from "../types/records";

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const filter = {
      _id: 0,
      id: "$_id",
      username: 1,
      email: 1,
      lastSeen: 1,
      status: 1,
    };
    const users = await userModel.aggregate([
      { $match: { role: "user" } },
      {
        $project: filter,
      },
    ]);
    res.json({ users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const filter = {
      _id: 0,
      id: "$_id",
      username: 1,
      email: 1,
      lastSeen: 1,
      status: 1,
    };
    const admins = await userModel.aggregate([
      { $match: { role: "admin" } },
      {
        $project: filter,
      },
    ]);
    res.json({ admins });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllRecords = async (req: Request, res: Response) => {
  try {
    let filters: Record<string, string | {}> = {};
    if (req.query) {
      const { date, type, category } = req.query;
      if (type) filters.type = type.toString();
      if (category) filters.category = category.toString();
      if (date) {
        if (!dayjs(date.toString(), "YYYY-MM-DD", true).isValid()) {
          return res
            .status(400)
            .json({ error: "Bad request (Invalid date format)" });
        }
        const st = dayjs(date.toString()).startOf("day").toDate();
        const end = dayjs(date.toString()).endOf("day").toDate();
        filters.date = { $gt: st, $lt: end };
      }
    }
    const records = await recordModel.aggregate([
      { $match: filters },
      {
        $project: {
          _id: 0,
          id: "$_id",
          userId: 1,
          amount: 1,
          type: 1,
          date: 1,
          category: 1,
          description: 1,
          createdBy: 1,
        },
      },
    ]);
    return res.json({ records });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

async function createOrUpdateSummary(userId: string, record: RecordType) {
  const summaryData = await recordModel.aggregate([
    { $match: { userId } },

    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalIncome: {
                $sum: {
                  $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                },
              },
              totalExpense: {
                $sum: {
                  $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                },
              },
            },
          },
        ],

        categoryWise: [
          {
            $group: {
              _id: "$category",
              total: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              total: 1,
            },
          },
        ],

        recentActivity: [{ $sort: { date: -1 } }, { $limit: 5 }],

        monthlyTrends: [
          {
            $group: {
              _id: { $dateToString: { format: "%b", date: "$date" } },
              total: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              month: "$_id",
              total: 1,
            },
          },
        ],

        weeklyTrends: [
          {
            $group: {
              _id: { $week: "$date" },
              total: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              week: "$_id",
              total: 1,
            },
          },
        ],

        yearlyTrends: [
          {
            $group: {
              _id: { $year: "$date" },
              total: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              year: "$_id",
              total: 1,
            },
          },
        ],
      },
    },
  ]);
  const totals = summaryData[0].totals[0] || {};
  const netBalance = (totals.totalIncome || 0) - (totals.totalExpense || 0);
  await summaryModel.findOneAndUpdate(
    { userId },
    {
      userId,
      totalIncome: totals.totalIncome || 0,
      totalExpense: totals.totalExpense || 0,
      netBalance,
      categoryWise: summaryData[0].categoryWise,
      RecentActivity: summaryData[0].recentActivity,
      monthlyTrends: summaryData[0].monthlyTrends,
      weeklyTrends: summaryData[0].weeklyTrends,
      yearlyTrends: summaryData[0].yearlyTrends,
    },
    { upsert: true, new: true },
  );
}

const createRecord = async (req: Request, res: Response) => {
  try {
    const { userId, amount, type, date, category, description } = req.body;
    const { id: admin } = req.user as MyJwtPayload;
    if (!userId || !amount || !type || !category || !description) {
      return res.status(400).json({
        message:
          "Bad Request (userId, amount, type, date, category, description is/are missing)",
      });
    }
    if (userId.length !== 24) {
      return res.status(400).json({
        message: `Invalid id (id should be of 24 characters, but found ${userId.length})`,
      });
    }
    if (date) {
      if (!dayjs(date.toString(), "YYYY-MM-DD", true).isValid()) {
        return res
          .status(400)
          .json({ error: "Bad request (Invalid date format)" });
      }
    }
    const user = await userModel.findById(userId).lean();
    if (!user) {
      return res
        .status(404)
        .json({ message: `Not found (cannot find user with id: ${userId})` });
    }
    const record = new recordModel({
      userId,
      amount,
      type,
      date,
      category,
      description,
      createdBy: admin,
    });
    await record.save();
    createOrUpdateSummary(userId, record);
    return res.status(201).json({ message: "Record created successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateRecord = async (req: Request, res: Response) => {
  const { id: admin } = req.user as MyJwtPayload;
  const { id } = req.params;
  if (id.length !== 24)
    return res.status(400).json({
      message: `Invalid id (id should be of 24 characters, but found ${id.length})`,
    });
  try {
    if (!req.body)
      return res
        .status(400)
        .json({ message: `Bad request (body expected but found nothing)` });
    const { amount, type, date, category, description, userId } = req.body;
    const record = (await recordModel.findById(id)) as RecordType;
    if (!record)
      return res
        .status(404)
        .json({ message: `Not found (cannot find record with the id: ${id})` });
    if (amount) record.amount = amount;
    if (type) record.type = type;
    if (date) record.date = date;
    if (category) record.category = category;
    if (description) record.description = description;
    if (userId) record.userId = userId;
    record.createdBy = admin;
    await record.save();
    createOrUpdateSummary(userId, record);
    return res.status(201).json({ message: "Record updated successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteRecord = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id.length !== 24)
    return res.status(400).json({
      message: `Invalid id (id should be of 24 characters, but found ${id.length})`,
    });
  try {
    const record = await recordModel.findByIdAndDelete(id);
    if (!record) {
      return res
        .status(404)
        .json({ message: `Not found (cannot find record with id: ${id})` });
    }
    return res.json({ message: "Deleted Successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const summary = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (userId.length !== 24)
      return res.status(400).json({
        message: `Invalid id (id should be of 24 characters, but found ${userId.length})`,
      });
    const tempSummary = await summaryModel.findOne({ userId }).lean();
    if (!tempSummary) {
      return res.status(404).json({
        message: `Not found (cannot find summary associated to userId: ${userId})`,
      });
    }
    const summary = {
      totalIncome: tempSummary.totalIncome,
      totalExpense: tempSummary.totalExpense,
      netBalance: tempSummary.netBalance,
      categoryWise: tempSummary.categoryWise,
      RecentActivity: tempSummary.RecentActivity,
      monthlyTrends: tempSummary.monthlyTrends,
      weeklyTrends: tempSummary.weeklyTrends,
      yearlyTrends: tempSummary.yearlyTrends,
    };
    return res.json({ summary });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const adminController = {
  getAllUsers,
  getAllAdmins,
  getAllRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  summary,
};
export default adminController;
