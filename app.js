const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const CLIENT_ID =
  "1075758188735-ao58ov1c5eommr1l7ms5brgr52i4o4s0.apps.googleusercontent.com";
const CLEINT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN =
  "1//044sGW0vCnOBNCgYIARAAGAQSNwF-L9IrdK__mefDIYtOc2ZNVe0rI4uTv2MaYlcRL0hdT2Fn268yBS7JshY7rwRTyjckQ9miBhU";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

let repliedEmailArray = [];

async function checkEmails() {
  try {
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const response = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
    });

    const messages = response.data.messages || [];

    for (const message of messages) {
      const messageData = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });

      addMailLabel(messageData.data);
    }
  } catch (err) {
    console.error("Error checking emails:", err);
  }
}

async function sendReply(emailData) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        type: "OAuth2",
        user: "t52511436@gmail.com",
        clientId: CLIENT_ID,
        clientSecret: CLEINT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: "t52511436@gmail.com",
      to: emailData,

      subject: "Automatic Reply",
      text: "Thank you for your email. I am currently on vacation and will respond to your message as soon as I return.",
    };

    let { messageId } = await transport.sendMail(mailOptions);

    console.log(messageId.replace("<", "").replace(">", ""));

    console.log("Reply sent successfully.");
  } catch (err) {
    console.error("Error sending reply:", err);
  }
}

async function addMailLabel(emailData) {
  try {
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const labelName = "vacations";
    const labelResponse = await gmail.users.labels.list({ userId: "me" });
    const existingLabel = labelResponse.data.labels.find(
      (label) => label.name === labelName
    );

    if (!existingLabel) {
      // Create label if it doesn't exist
      await gmail.users.labels.create({
        userId: "me",
        requestBody: { name: labelName },
      });
    }

    const modifyRequest = {
      userId: "me",
      id: emailData.id,
      requestBody: {
        addLabelIds: [
          existingLabel ? existingLabel.id : labelResponse.data.labels[0].id,
        ],
        removeLabelIds: ["INBOX"],
      },
    };
    let mainData = await gmail.users.messages.modify(modifyRequest);

    const hasReplies = emailData.payload.headers.filter((el) => {
      return el.name === "From";
    });

    let hasReplies2 = hasReplies[0].value.split("<")[1].replace(">", "");

    await sendReply(hasReplies2);

    console.log("Email labeled and moved successfully.");
  } catch (err) {
    console.error("Error adding label and moving email:", err);
  }
}

// checkEmails();

setInterval(
  checkEmails,
  Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000
);
