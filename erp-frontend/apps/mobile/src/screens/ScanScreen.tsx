import { useState, useEffect } from 'react';
import { View, StyleSheet, Button as RNButton } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { YStack, Text, Card, Button } from 'tamagui';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setScannedData(data);
    // TODO: Query product by barcode
    alert(`扫码成功: ${data}`);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>需要相机权限才能进行扫码</Text>
        <RNButton title="授权相机" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <YStack f={1}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <YStack position="absolute" bottom={0} left={0} right={0} p="$4" space="$2">
        {scanned && (
          <Card elevate bordered p="$3" bg="$background">
            <Text fontSize="$4" textAlign="center">
              扫码结果: {scannedData}
            </Text>
            <Button theme="active" mt="$2" onPress={() => setScanned(false)}>
              继续扫码
            </Button>
          </Card>
        )}

        <Card elevate bordered p="$3" bg="$background">
          <Text fontSize="$3" textAlign="center" color="$gray10">
            将二维码/条形码放入框内即可自动扫描
          </Text>
        </Card>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
});
