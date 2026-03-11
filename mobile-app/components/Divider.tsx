import { StyleSheet, View } from "react-native";

export function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: "#e8e0cf",
    marginVertical: 2,
  },
});
