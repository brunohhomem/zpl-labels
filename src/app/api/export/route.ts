import { proxyLabelaryRequest } from "@/lib/labelary/server";

export function POST(request: Request) {
  return proxyLabelaryRequest(request, "application/pdf");
}
