import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

async function getImage(image: string, retries = 3): Promise<any> {
  try {
    const { data } = await axios.get(image, { responseType: 'arraybuffer' });
    return data
  } catch {
    if (retries) {
      return getImage(image, retries - 1);
    }
    throw new Error("Error getting image")
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { image } = req.query;
  try {

    const buffer = await getImage(image as string)
    res.status(200).end(buffer)
  } catch {
    res.status(500).send("Error getting image")
  }
}