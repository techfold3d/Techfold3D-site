// TechFold3D form handler. Paste this into a Google Apps Script project
// (script.google.com), deploy as a Web app, and put the /exec URL in js/config.js.

const SETTINGS = {
  EMAIL_TO: "techfold3d@gmail.com",
  UPLOAD_FOLDER_NAME: "TechFold 3D Customer Orders",
  MAX_FILE_SIZE_MB: 10
};

const FORMS = {
  drafting: { tag: "DRAFT", title: "Drafting Request" },
  print:    { tag: "3D PRINTING", title: "3D Printing Order" },
  repair:   { tag: "REPAIR", title: "3D Printer Repair Request" },
  contact:  { tag: "MESSAGE", title: "Website Message" }
};

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const form = FORMS[p.formType];
    if (!form) return reply_({ ok: false, error: "Unknown form" });

    let fields = [];
    try { fields = JSON.parse(p._fields || "[]"); } catch (err) {}

    let body = "TECHFOLD 3D - " + form.title.toUpperCase() + "\n" +
               "================================\n\n";
    fields.forEach(function (k) {
      if (p[k]) body += k.toUpperCase() + ":\n" + p[k] + "\n\n";
    });

    // Optional file upload (print form)
    if (p.fileData && p.fileName) {
      const bytes = Utilities.base64Decode(p.fileData);
      if (bytes.length > SETTINGS.MAX_FILE_SIZE_MB * 1024 * 1024) {
        return reply_({ ok: false, error: "File too large" });
      }
      const blob = Utilities.newBlob(bytes, p.fileType || "application/octet-stream", p.fileName);
      const file = getUploadFolder_().createFile(blob);
      body += "UPLOADED FILE:\n" + file.getName() + "\n\nFILE LINK:\n" + file.getUrl() + "\n\n";
    }

    const options = { to: SETTINGS.EMAIL_TO, subject: "[" + form.tag + "] New " + form.title, body: body, name: "TechFold3D Website" };
    if (p.Email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.Email)) options.replyTo = p.Email; // reply goes to the customer
    MailApp.sendEmail(options);

    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getUploadFolder_() {
  const folders = DriveApp.getFoldersByName(SETTINGS.UPLOAD_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(SETTINGS.UPLOAD_FOLDER_NAME);
}

// Run this once from the editor to grant Drive + Mail permissions.
function authorize() {
  getUploadFolder_();
  MailApp.getRemainingDailyQuota();
}
