const express = require("express");
const multer = require("multer");
const {
  list,
  summary,
  getOne,
  create,
  update,
  remove,
  reminders,
  importTransactions,
} = require("../controllers/transactionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.originalname)) {
      return cb(new Error("Only .csv, .xlsx, and .xls files are supported"));
    }
    cb(null, true);
  },
});

router.use(protect);
router.get("/summary", summary);
router.get("/reminders", reminders);
router.post("/import", upload.single("file"), importTransactions);
router.route("/").get(list).post(create);
router.route("/:id").get(getOne).put(update).delete(remove);

module.exports = router;
