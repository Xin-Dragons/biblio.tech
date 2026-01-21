import puppeteer from "puppeteer"
import { NextApiRequest, NextApiResponse } from "next"

export default async function getJson(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { uri } = req.body
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(uri as string)
    await page.waitForSelector("pre")
    let element = await page.$("pre")
    let value = await page.evaluate((el) => el?.textContent, element)

    res.json(JSON.parse(value as string))
  } catch {
    res.end("Unable to parse json")
  }
}
