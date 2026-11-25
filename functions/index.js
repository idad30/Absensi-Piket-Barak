const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({ region: "asia-southeast1", maxInstances: 5 });

const WA_ACCESS_TOKEN = defineSecret("WA_ACCESS_TOKEN");
const WA_PHONE_NUMBER_ID = defineSecret("WA_PHONE_NUMBER_ID");
const WA_ADMIN_TO = defineSecret("WA_ADMIN_TO");
const WA_TEMPLATE_NAME = defineSecret("WA_TEMPLATE_NAME");
const WA_GRAPH_API_VERSION = defineSecret("WA_GRAPH_API_VERSION");

exports.notifyAttendanceOnWhatsApp = onDocumentCreated({
  document: "attendance/{recordId}",
  secrets: [WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_ADMIN_TO, WA_TEMPLATE_NAME, WA_GRAPH_API_VERSION],
}, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data() || {};
  const required = ["memberName", "date", "day", "status", "beforePhotoUrl", "afterPhotoUrl"];
  const missing = required.filter((key) => !data[key]);
  if (missing.length) {
    await snap.ref.update({ waStatus: "skipped", waError: "Data belum lengkap: " + missing.join(", ") });
    return;
  }

  const db = getFirestore();
  const token = WA_ACCESS_TOKEN.value();
  const phoneId = WA_PHONE_NUMBER_ID.value();
  const recipient = WA_ADMIN_TO.value().replace(/[^0-9]/g, "");
  const templateName = WA_TEMPLATE_NAME.value();
  const apiVersion = WA_GRAPH_API_VERSION.value();

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: "id" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: String(data.memberName).slice(0, 100) },
              { type: "text", text: String(data.date).slice(0, 40) },
              { type: "text", text: String(data.day).slice(0, 40) },
              { type: "text", text: String(data.status).slice(0, 30) },
              { type: "text", text: String(data.beforePhotoUrl).slice(0, 900) },
              { type: "text", text: String(data.afterPhotoUrl).slice(0, 900) },
            ],
          }],
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.message || `WhatsApp API error ${response.status}`);
    }

    await snap.ref.update({
      waStatus: "sent",
      waMessageId: result?.messages?.[0]?.id || null,
      waSentAt: FieldValue.serverTimestamp(),
      waError: null,
    });
  } catch (error) {
    console.error("WhatsApp attendance notification failed", error);
    await snap.ref.update({
      waStatus: "failed",
      waError: String(error.message || error).slice(0, 500),
      waAttemptedAt: FieldValue.serverTimestamp(),
    });
  }
});
