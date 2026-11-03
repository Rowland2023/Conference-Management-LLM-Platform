// src/shared/infrastructure/middleware/webhookRawBody.js

import express from "express";

export function webhookRawBody() {
  return express.raw({
    type: "application/json"
  });
}