import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const logoSource = require('../../../assets/images/casa-fresh-logo.png');

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: { width: 96, height: 96 },
  md: { width: 140, height: 140 },
  lg: { width: 180, height: 180 },
} as const;

export function Logo({ size = 'md' }: LogoProps) {
  const dims = SIZES[size];

  return (
    <View style={styles.wrap}>
      <Image
        source={logoSource}
        style={{ width: dims.width, height: dims.height }}
        contentFit="contain"
        accessibilityLabel="Casa Fresh"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
