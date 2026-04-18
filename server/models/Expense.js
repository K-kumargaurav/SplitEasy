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
    },
    category: {
        type: String,
        enum: ["food", "transport", "accommodation", "entertainment", "shopping", "utilities", "travel", "other"],
        default: "other"
    },
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        text: {
            type: String,
            trim: true,
            maxlength: 300
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

expenseSchema.index({ group: 1 });
expenseSchema.index({ paidBy: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
