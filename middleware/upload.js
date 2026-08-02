const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const paymentFileFilter = (req, file, cb) => {
  const allowed = ['.csv', '.xlsx', '.xls', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only CSV, Excel, or PDF files are allowed'), false);
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });
const uploadPayment = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: paymentFileFilter });

module.exports = upload;
module.exports.uploadPayment = uploadPayment;
