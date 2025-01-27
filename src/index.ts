import "dotenv/config";
import puppeteer from "puppeteer";

async function main() {
  const browser = await puppeteer.launch({
    timeout: 0,
    headless: false,
    args: ["--no-sandbox", "--start-fullscreen"],
  });
  const page = await browser.newPage();

  await page.goto("https://skool.com/login");

  await page.setViewport({ width: 1920, height: 1080 });

  await page.type("#email", process.env.SKOOL_USERNAME);
  await page.type("#password", process.env.SKOOL_PASSWORD);

  await page.click('button[type="submit"');
  await page.waitForNavigation();

  await page.locator("div ::-p-text(Classroom)").click();
  await page.waitForNavigation();

  const [communities, chats, notifications, profile, ...buttons] =
    await page.$$('::-p-aria([role="button"])');

  // Iterate through the buttons and perform actions
  for (const button of buttons) {
  }

  console.log("Num items: " + buttons.length);

  buttons[3].click();
}

main();
