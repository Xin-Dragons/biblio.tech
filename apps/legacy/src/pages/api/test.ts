import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import axios from "axios";
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { urls } = req.body;

  try {
    const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!)
      .use(mockStorage())
      .use(httpDownloader());
    const downloaded = await umi.downloader.download(urls)
    
    res.status(200).send(downloaded)
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data;
    res.status(500).send({ message });
  }
}