import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger(__name__)


async def send_price_alert_email(
    to_email: str,
    origin: str,
    destination: str,
    departure_date: str,
    price: int,
    threshold: int,
    link: str = "https://www.google.com/flights",
) -> None:
    """Send a price-drop alert email via SMTP.

    Does nothing (logs a warning) when SMTP credentials are not configured.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_FROM_EMAIL", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        log.warning(
            "SMTP not configured — skipping price alert email to %s "
            "(%s→%s on %s: ₹%s)",
            to_email, origin, destination, departure_date, f"{price:,}",
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"✈️ Price Alert: {origin}→{destination} now ₹{price:,}"
    msg["From"]    = smtp_user
    msg["To"]      = to_email

    savings = threshold - price
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Price Alert</title>
  <style>
    body  {{ font-family: Arial, Helvetica, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }}
    .wrap {{ max-width: 560px; margin: 32px auto; background: #ffffff;
             border-radius: 8px; overflow: hidden;
             box-shadow: 0 2px 8px rgba(0,0,0,.10); }}
    .hdr  {{ background: #1a56db; color: #ffffff; padding: 28px 32px; }}
    .hdr h1 {{ margin: 0; font-size: 22px; }}
    .hdr p  {{ margin: 6px 0 0; font-size: 14px; opacity: .85; }}
    .body {{ padding: 28px 32px; }}
    .row  {{ display: flex; justify-content: space-between;
             border-bottom: 1px solid #e5e7eb; padding: 10px 0; font-size: 15px; }}
    .row:last-of-type {{ border-bottom: none; }}
    .label {{ color: #6b7280; }}
    .value {{ font-weight: 600; color: #111827; }}
    .price {{ font-size: 28px; font-weight: 700; color: #16a34a; }}
    .saving {{ font-size: 13px; color: #16a34a; margin-top: 2px; }}
    .btn  {{ display: inline-block; margin-top: 24px; padding: 14px 28px;
             background: #1a56db; color: #ffffff; text-decoration: none;
             border-radius: 6px; font-size: 15px; font-weight: 600; }}
    .ftr  {{ padding: 16px 32px; background: #f9fafb;
             font-size: 12px; color: #9ca3af; text-align: center; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <h1>✈️ Price Alert Triggered!</h1>
      <p>A flight you're watching just dropped below your target price.</p>
    </div>
    <div class="body">
      <div class="row">
        <span class="label">Route</span>
        <span class="value">{origin} → {destination}</span>
      </div>
      <div class="row">
        <span class="label">Departure date</span>
        <span class="value">{departure_date}</span>
      </div>
      <div class="row">
        <span class="label">Your target price</span>
        <span class="value">₹{threshold:,}</span>
      </div>
      <div class="row">
        <span class="label">Price found</span>
        <span class="value">
          <div class="price">₹{price:,}</div>
          {"<div class='saving'>You save ₹" + f"{savings:,}</div>" if savings > 0 else ""}
        </span>
      </div>
      <a class="btn" href="{link}" target="_blank" rel="noopener noreferrer">
        View Flights
      </a>
    </div>
    <div class="ftr">
      You received this email because you set up a price alert on Plan Advisor.<br />
      Prices change frequently — book quickly to lock in this fare.
    </div>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(html, "html"))

    try:
        import aiosmtplib
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
        )
        log.info(
            "Price alert email sent to %s (%s→%s on %s: ₹%s)",
            to_email, origin, destination, departure_date, f"{price:,}",
        )
    except Exception as exc:
        log.error(
            "Failed to send price alert email to %s: %s",
            to_email, exc,
        )
