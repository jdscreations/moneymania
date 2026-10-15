import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/** Save text (a CSV or JSON export) to a file and open the share sheet so it can go to Drive, email or WhatsApp. */
export async function shareText(filename: string, text: string, mimeType: string) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
}

/** Turn a report page into a PDF on the phone and share it. */
export async function sharePdf(html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
