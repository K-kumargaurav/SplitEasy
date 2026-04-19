const translations = {
  en: {
    // Navigation
    "nav.groups":   "Groups",
    "nav.payments": "Payments",
    "nav.activity": "Activity",
    "nav.profile":  "Profile",

    // Settlement requests
    "sr.title":       "Settlement Requests",
    "sr.wants_to_pay":"wants to pay you",
    "sr.confirm":     "Confirm ✓",
    "sr.reject":      "Reject",

    // Invites
    "invites.title":   "Invites",
    "invites.from":    "from",
    "invites.accept":  "Accept",
    "invites.decline": "Decline",

    // Groups tab
    "groups.title":       "Your Groups",
    "groups.new":         "New Group",
    "groups.empty_title": "No groups yet",
    "groups.empty_sub":   "Create one and start splitting",
    "groups.create":      "+ Create Group",
    "groups.members":     "members",

    // Payments tab
    "payments.all_settled": "All settled up!",
    "payments.no_debts":    "You don't owe anyone right now",
    "payments.you_owe":     "You Owe",
    "payments.tap_hint":    "Tap a row to go to that group and settle up",

    // Activity tab
    "activity.empty_title": "No activity yet",
    "activity.empty_sub":   "Your settlement history will show here",
    "activity.recent":      "Recent Activity",
    "activity.confirmed":   "Confirmed",
    "activity.rejected":    "Rejected",
    "activity.pending":     "Pending",

    // Profile tab
    "profile.online":             "Online",
    "profile.offline":            "Offline",
    "profile.last_seen_today":    "Last seen today at",
    "profile.last_seen_yesterday":"Last seen yesterday at",
    "profile.last_seen":          "Last seen",
    "profile.at":                 "at",
    "profile.bio":                "Bio",
    "profile.bio_edit":           "Edit",
    "profile.bio_add":            "+ Add",
    "profile.bio_placeholder":    "Tell people a bit about yourself…",
    "profile.bio_saving":         "Saving…",
    "profile.save":               "Save",
    "profile.cancel":             "Cancel",
    "profile.no_bio":             "No bio yet",
    "profile.public":             "Public Profile",
    "profile.public_on":          "Others can see your photo, bio & username",
    "profile.public_off":         "Only your name is visible to others",
    "profile.groups_joined":      "Groups joined",
    "profile.pending_payments":   "Pending payments",
    "profile.all_clear":          "All clear ✓",
    "profile.change_password":    "Change Password",
    "profile.sign_out":           "Sign Out",
    "profile.language":           "Language",

    // Change password flow
    "pw.will_send":        "We'll send a 6-digit verification code to",
    "pw.sending":          "Sending…",
    "pw.send_code":        "Send Verification Code",
    "pw.code_sent":        "✓ Code sent! Check your email.",
    "pw.verification_code":"Verification Code",
    "pw.code_placeholder": "6-digit code",
    "pw.new_password":     "New Password",
    "pw.confirm_password": "Confirm Password",
    "pw.change":           "Change Password",
    "pw.changing":         "Changing…",
    "pw.resend":           "Resend",
    "pw.success":          "Password changed successfully ✓",
    "pw.error_mismatch":   "New passwords don't match",
    "pw.error_length":     "Password must be at least 6 characters",
    "pw.error_otp":        "Enter the OTP sent to your email",

    // Create group sheet
    "create_group.title":             "Create Group",
    "create_group.name":              "Group Name",
    "create_group.name_placeholder":  "e.g. Goa Trip, Monthly Rent…",
    "create_group.notes":             "Notes",
    "create_group.notes_optional":    "(optional)",
    "create_group.notes_placeholder": "Purpose, dates, etc.",
    "create_group.invite_members":    "Invite Members",
    "create_group.create":            "Create",
    "create_group.cancel":            "Cancel",

    // Notifications
    "notif.title": "Notifications",
    "notif.empty": "Nothing here yet",

    // GroupDetail — general
    "gd.members_count":    "members",
    "gd.members":          "Members",
    "gd.invite":           "+ Invite",
    "gd.you_badge":        "YOU",
    "gd.leave_group":      "Leave group",
    "gd.invite_requests":  "Invite Requests",
    "gd.user_invited":     "User invited by a member",
    "gd.approve":          "Approve",
    "gd.decline":          "Decline",
    "gd.pending_approval": "Pending Approval",

    // Pending actions
    "gd.leave_detail":      "Approve or decline their leave request",
    "gd.majority_required": "majority vote required",
    "gd.proposed_by":       "Proposed by",
    "gd.wants_to_leave":    "wants to leave",
    "gd.remove_prefix":     "Remove",
    "gd.approved_count":    "{n} approved",
    "gd.rejected_count":    "{n} rejected",
    "gd.approve_vote":      "Approve",
    "gd.decline_vote":      "Decline",

    // Tabs
    "gd.tab_expenses": "expenses",
    "gd.tab_balances": "balances",
    "gd.tab_activity": "activity",

    // Expenses tab
    "gd.breakdown":          "📊 Breakdown",
    "gd.export_csv":         "⬇ Export CSV",
    "gd.spending_breakdown": "Spending Breakdown",
    "gd.no_expenses_title":  "No expenses yet",
    "gd.no_expenses_sub":    "Add the first one to start tracking",
    "gd.paid_by":            "Paid by",
    "gd.add_expense":        "+ Add Expense",
    "gd.notes_count":        "{n} notes",
    "gd.confirm_delete":     "Delete this expense?",

    // Balances tab
    "gd.all_settled":    "All settled up!",
    "gd.no_balances":    "No pending balances",
    "gd.you_owe":        "You Owe",
    "gd.owed_to_you":    "Owed to You",
    "gd.others":         "Others",
    "gd.you_owe_text":   "You owe",
    "gd.owes_you":       "owes you",
    "gd.owes":           "owes",
    "gd.request_pending":"⏳ Request Pending",
    "gd.settle_up":      "Settle Up",

    // Activity tab
    "gd.no_activity_title": "No activity yet",
    "gd.no_activity_sub":   "Expenses and settlements will appear here",
    "gd.status_settled":    "Settled",
    "gd.status_rejected":   "Rejected",
    "gd.status_pending":    "Pending",

    // Add expense sheet
    "gd.add_expense_sheet_title": "Add Expense",
    "gd.description":            "Description",
    "gd.description_placeholder":"e.g. Dinner, Hotel, Fuel…",
    "gd.amount":                 "Amount (₹)",
    "gd.category":               "Category",
    "gd.paid_by_label":          "Paid by",
    "gd.split_type":             "Split Type",
    "gd.split_equal":            "equal",
    "gd.split_custom":           "custom",
    "gd.amount_per_member":      "Amount per member",
    "gd.total":                  "Total",
    "gd.add_expense_btn":        "Add Expense",
    "gd.cancel":                 "Cancel",
    "gd.save":                   "Save",
    "gd.you_label":              "You",

    // Edit / delete group
    "gd.edit_group":             "Edit Group",
    "gd.group_name":             "Group Name",
    "gd.group_desc":             "Description",
    "gd.group_desc_optional":    "(optional)",
    "gd.save_group":             "Save Changes",
    "gd.delete_group":           "Delete Group",
    "gd.confirm_delete_group":   "Delete \"{name}\"? This will permanently remove all expenses and cannot be undone.",
    "gd.deleting":               "Deleting…",

    // Confirm dialogs
    "gd.confirm_leave":   "Request to leave this group? The creator must approve.",
    "gd.confirm_remove":  "Start a vote to remove {name}? Other members must approve.",

    // Member profile sheet
    "gd.member_profile":   "Member Profile",
    "gd.bio":              "Bio",
    "gd.private_profile":  "🔒 This member's profile is private",
    "gd.could_not_load":   "Could not load profile",
    "gd.online":           "🟢 Online",
    "gd.last_seen":        "Last seen",
    "gd.today_at":         "Today at",
    "gd.yesterday_at":     "Yesterday at",

    // Edit expense dialog
    "gd.edit_expense": "Edit Expense",

    // Settle up dialog
    "gd.settle_up_title": "Settle Up",
    "gd.max_amount":      "Max amount:",
    "gd.enter_amount":    "Enter amount",
    "gd.send_request":    "Send Request",

    // Note/comment
    "gd.note_placeholder": "Add a note…",
    "gd.post":             "Post",

    // Login page
    "login.tagline":    "Split bills, not friendships",
    "login.email":      "Email",
    "login.password":   "Password",
    "login.signing_in": "Signing in…",
    "login.sign_in":    "Sign In",
    "login.or":         "or",
    "login.no_account": "Don't have an account?",
    "login.register":   "Register",

    // Register page
    "reg.tagline":           "Split bills, not friendships",
    "reg.full_name":         "Full Name",
    "reg.name_placeholder":  "Your name",
    "reg.email":             "Email",
    "reg.country":           "Country",
    "reg.password":          "Password",
    "reg.pass_placeholder":  "Min. 8 chars, uppercase & number",
    "login.google_failed":   "Google login failed. Try again.",
    "reg.google_failed":     "Google sign-up failed. Try again.",
    "reg.pass_hint":         "At least 8 characters, 1 uppercase, 1 number",
    "reg.creating":          "Creating account…",
    "reg.create":            "Create Account",
    "reg.or":                "or",
    "reg.has_account":       "Already have an account?",
    "reg.sign_in":           "Sign In",

    // Categories
    "cat.food":          "Food",
    "cat.transport":     "Transport",
    "cat.accommodation": "Stay",
    "cat.entertainment": "Fun",
    "cat.shopping":      "Shopping",
    "cat.utilities":     "Utilities",
    "cat.travel":        "Travel",
    "cat.other":         "Other",
  },

  hi: {
    // Navigation
    "nav.groups":   "समूह",
    "nav.payments": "भुगतान",
    "nav.activity": "गतिविधि",
    "nav.profile":  "प्रोफ़ाइल",

    // Settlement requests
    "sr.title":       "भुगतान अनुरोध",
    "sr.wants_to_pay":"आपको भुगतान करना चाहता है",
    "sr.confirm":     "स्वीकार करें ✓",
    "sr.reject":      "अस्वीकार",

    // Invites
    "invites.title":   "आमंत्रण",
    "invites.from":    "से",
    "invites.accept":  "स्वीकार करें",
    "invites.decline": "अस्वीकार करें",

    // Groups tab
    "groups.title":       "आपके समूह",
    "groups.new":         "नया ग्रुप",
    "groups.empty_title": "अभी कोई समूह नहीं",
    "groups.empty_sub":   "एक बनाएं और बिल बांटना शुरू करें",
    "groups.create":      "+ समूह बनाएं",
    "groups.members":     "सदस्य",

    // Payments tab
    "payments.all_settled": "सब भुगतान हो गया!",
    "payments.no_debts":    "अभी आप किसी के कुछ नहीं देते",
    "payments.you_owe":     "आप देते हैं",
    "payments.tap_hint":    "भुगतान करने के लिए उस समूह पर जाएं",

    // Activity tab
    "activity.empty_title": "अभी कोई गतिविधि नहीं",
    "activity.empty_sub":   "आपका भुगतान इतिहास यहाँ दिखेगा",
    "activity.recent":      "हाल की गतिविधि",
    "activity.confirmed":   "पुष्टि हो गई",
    "activity.rejected":    "अस्वीकृत",
    "activity.pending":     "लंबित",

    // Profile tab
    "profile.online":             "ऑनलाइन",
    "profile.offline":            "ऑफलाइन",
    "profile.last_seen_today":    "आज देखा गया",
    "profile.last_seen_yesterday":"कल देखा गया",
    "profile.last_seen":          "आखरी बार देखा",
    "profile.at":                 "बजे",
    "profile.bio":                "परिचय",
    "profile.bio_edit":           "संपादित करें",
    "profile.bio_add":            "+ जोड़ें",
    "profile.bio_placeholder":    "अपने बारे में थोड़ा बताएं…",
    "profile.bio_saving":         "सहेज रहे हैं…",
    "profile.save":               "सहेजें",
    "profile.cancel":             "रद्द करें",
    "profile.no_bio":             "अभी कोई परिचय नहीं",
    "profile.public":             "सार्वजनिक प्रोफ़ाइल",
    "profile.public_on":          "अन्य लोग आपकी फ़ोटो, परिचय और नाम देख सकते हैं",
    "profile.public_off":         "केवल आपका नाम दूसरों को दिखता है",
    "profile.groups_joined":      "जुड़े हुए समूह",
    "profile.pending_payments":   "लंबित भुगतान",
    "profile.all_clear":          "सब ठीक ✓",
    "profile.change_password":    "पासवर्ड बदलें",
    "profile.sign_out":           "साइन आउट",
    "profile.language":           "भाषा",

    // Change password flow
    "pw.will_send":        "हम एक 6-अंकीय सत्यापन कोड भेजेंगे",
    "pw.sending":          "भेज रहे हैं…",
    "pw.send_code":        "सत्यापन कोड भेजें",
    "pw.code_sent":        "✓ कोड भेज दिया! अपना ईमेल जांचें।",
    "pw.verification_code":"सत्यापन कोड",
    "pw.code_placeholder": "6-अंकीय कोड",
    "pw.new_password":     "नया पासवर्ड",
    "pw.confirm_password": "पासवर्ड की पुष्टि",
    "pw.change":           "पासवर्ड बदलें",
    "pw.changing":         "बदल रहे हैं…",
    "pw.resend":           "दोबारा भेजें",
    "pw.success":          "पासवर्ड सफलतापूर्वक बदल दिया गया ✓",
    "pw.error_mismatch":   "नए पासवर्ड मेल नहीं खाते",
    "pw.error_length":     "पासवर्ड कम से कम 6 अक्षर का होना चाहिए",
    "pw.error_otp":        "ईमेल पर भेजा गया OTP दर्ज करें",

    // Create group sheet
    "create_group.title":             "समूह बनाएं",
    "create_group.name":              "समूह का नाम",
    "create_group.name_placeholder":  "जैसे गोवा यात्रा, मासिक किराया…",
    "create_group.notes":             "टिप्पणी",
    "create_group.notes_optional":    "(वैकल्पिक)",
    "create_group.notes_placeholder": "उद्देश्य, तारीख, आदि।",
    "create_group.invite_members":    "सदस्यों को आमंत्रित करें",
    "create_group.create":            "बनाएं",
    "create_group.cancel":            "रद्द करें",

    // Notifications
    "notif.title": "सूचनाएं",
    "notif.empty": "अभी यहाँ कुछ नहीं है",

    // GroupDetail — general
    "gd.members_count":    "सदस्य",
    "gd.members":          "सदस्य",
    "gd.invite":           "+ आमंत्रित करें",
    "gd.you_badge":        "आप",
    "gd.leave_group":      "समूह छोड़ें",
    "gd.invite_requests":  "आमंत्रण अनुरोध",
    "gd.user_invited":     "एक सदस्य द्वारा आमंत्रित",
    "gd.approve":          "मंजूर करें",
    "gd.decline":          "अस्वीकार करें",
    "gd.pending_approval": "अनुमोदन लंबित",

    // Pending actions
    "gd.leave_detail":      "उनके जाने का अनुरोध स्वीकार या अस्वीकार करें",
    "gd.majority_required": "बहुमत मतदान आवश्यक",
    "gd.proposed_by":       "प्रस्तावित",
    "gd.wants_to_leave":    "जाना चाहते हैं",
    "gd.remove_prefix":     "हटाएं",
    "gd.approved_count":    "{n} सहमत",
    "gd.rejected_count":    "{n} असहमत",
    "gd.approve_vote":      "मंजूर करें",
    "gd.decline_vote":      "अस्वीकार करें",

    // Tabs
    "gd.tab_expenses": "खर्चे",
    "gd.tab_balances": "शेष",
    "gd.tab_activity": "गतिविधि",

    // Expenses tab
    "gd.breakdown":          "📊 विवरण",
    "gd.export_csv":         "⬇ CSV डाउनलोड",
    "gd.spending_breakdown": "व्यय विवरण",
    "gd.no_expenses_title":  "अभी कोई खर्च नहीं",
    "gd.no_expenses_sub":    "ट्रैकिंग शुरू करने के लिए पहला जोड़ें",
    "gd.paid_by":            "किसने भुगतान किया",
    "gd.add_expense":        "+ खर्च जोड़ें",
    "gd.notes_count":        "{n} टिप्पणी",
    "gd.confirm_delete":     "यह खर्च हटाएं?",

    // Balances tab
    "gd.all_settled":    "सब भुगतान हो गया!",
    "gd.no_balances":    "कोई लंबित शेष नहीं",
    "gd.you_owe":        "आप देते हैं",
    "gd.owed_to_you":    "आप पर बकाया है",
    "gd.others":         "अन्य",
    "gd.you_owe_text":   "आप देते हैं",
    "gd.owes_you":       "आप पर बकाया है",
    "gd.owes":           "देता है",
    "gd.request_pending":"⏳ अनुरोध लंबित",
    "gd.settle_up":      "भुगतान करें",

    // Activity tab
    "gd.no_activity_title": "अभी कोई गतिविधि नहीं",
    "gd.no_activity_sub":   "खर्चे और भुगतान यहाँ दिखेंगे",
    "gd.status_settled":    "निपटाया गया",
    "gd.status_rejected":   "अस्वीकृत",
    "gd.status_pending":    "लंबित",

    // Add expense sheet
    "gd.add_expense_sheet_title": "खर्च जोड़ें",
    "gd.description":            "विवरण",
    "gd.description_placeholder":"जैसे रात का खाना, होटल, ईंधन…",
    "gd.amount":                 "राशि (₹)",
    "gd.category":               "श्रेणी",
    "gd.paid_by_label":          "किसने भुगतान किया",
    "gd.split_type":             "बंटवारे का प्रकार",
    "gd.split_equal":            "बराबर",
    "gd.split_custom":           "कस्टम",
    "gd.amount_per_member":      "प्रति सदस्य राशि",
    "gd.total":                  "कुल",
    "gd.add_expense_btn":        "खर्च जोड़ें",
    "gd.cancel":                 "रद्द करें",
    "gd.save":                   "सहेजें",
    "gd.you_label":              "आप",

    // Edit / delete group
    "gd.edit_group":             "समूह संपादित करें",
    "gd.group_name":             "समूह का नाम",
    "gd.group_desc":             "विवरण",
    "gd.group_desc_optional":    "(वैकल्पिक)",
    "gd.save_group":             "बदलाव सहेजें",
    "gd.delete_group":           "समूह हटाएं",
    "gd.confirm_delete_group":   "\"{name}\" हटाएं? सभी खर्चे स्थायी रूप से हट जाएंगे।",
    "gd.deleting":               "हटा रहे हैं…",

    // Confirm dialogs
    "gd.confirm_leave":   "इस समूह को छोड़ने का अनुरोध करें? क्रिएटर को मंजूरी देनी होगी।",
    "gd.confirm_remove":  "{name} को हटाने के लिए वोट शुरू करें? अन्य सदस्यों की मंजूरी जरूरी है।",

    // Member profile sheet
    "gd.member_profile":   "सदस्य प्रोफ़ाइल",
    "gd.bio":              "परिचय",
    "gd.private_profile":  "🔒 इस सदस्य की प्रोफ़ाइल निजी है",
    "gd.could_not_load":   "प्रोफ़ाइल लोड नहीं हो सकी",
    "gd.online":           "🟢 ऑनलाइन",
    "gd.last_seen":        "आखरी बार देखा",
    "gd.today_at":         "आज",
    "gd.yesterday_at":     "कल",

    // Edit expense dialog
    "gd.edit_expense": "खर्च संपादित करें",

    // Settle up dialog
    "gd.settle_up_title": "भुगतान करें",
    "gd.max_amount":      "अधिकतम राशि:",
    "gd.enter_amount":    "राशि दर्ज करें",
    "gd.send_request":    "अनुरोध भेजें",

    // Note/comment
    "gd.note_placeholder": "एक टिप्पणी जोड़ें…",
    "gd.post":             "पोस्ट करें",

    // Login page
    "login.tagline":    "बिल बांटें, दोस्ती नहीं",
    "login.email":      "ईमेल",
    "login.password":   "पासवर्ड",
    "login.signing_in": "साइन इन हो रहा है…",
    "login.sign_in":    "साइन इन करें",
    "login.or":         "या",
    "login.no_account": "खाता नहीं है?",
    "login.register":   "पंजीकरण करें",

    // Register page
    "reg.tagline":           "बिल बांटें, दोस्ती नहीं",
    "reg.full_name":         "पूरा नाम",
    "reg.name_placeholder":  "आपका नाम",
    "reg.email":             "ईमेल",
    "reg.country":           "देश",
    "reg.password":          "पासवर्ड",
    "reg.pass_placeholder":  "न्यूनतम 8 अक्षर, अपरकेस और नंबर",
    "login.google_failed":   "Google लॉगिन विफल। पुनः प्रयास करें।",
    "reg.google_failed":     "Google साइनअप विफल। पुनः प्रयास करें।",
    "reg.pass_hint":         "कम से कम 8 अक्षर, 1 अपरकेस, 1 नंबर",
    "reg.creating":          "खाता बना रहे हैं…",
    "reg.create":            "खाता बनाएं",
    "reg.or":                "या",
    "reg.has_account":       "पहले से खाता है?",
    "reg.sign_in":           "साइन इन करें",

    // Categories
    "cat.food":          "खाना",
    "cat.transport":     "परिवहन",
    "cat.accommodation": "ठहरना",
    "cat.entertainment": "मनोरंजन",
    "cat.shopping":      "खरीदारी",
    "cat.utilities":     "उपयोगिताएं",
    "cat.travel":        "यात्रा",
    "cat.other":         "अन्य",
  },
};

export default translations;
