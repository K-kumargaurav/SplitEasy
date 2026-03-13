const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    splitBetween: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        share: {
            type: Number,
            default: 0
        },
        paid: {
            type: Boolean,
            default: false
        }
    }],
    splitType: {
        type: String,
        enum: ["equal", "custom"],
        default: "equal"
    }
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
