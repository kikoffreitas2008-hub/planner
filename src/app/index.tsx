import { Redirect } from "expo-router";

// Today is the landing tab (product spec section 2).
export default function Index() {
  return <Redirect href="/today" />;
}
