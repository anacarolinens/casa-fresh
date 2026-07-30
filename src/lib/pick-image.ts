import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedImage = {
  uri: string;
  mimeType: string | null;
};

async function launchLibrary(): Promise<PickedImage | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão', 'Precisamos de acesso às fotos.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    // allowsEditing falha com frequência no web
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    mimeType: result.assets[0].mimeType ?? 'image/jpeg',
  };
}

async function launchCamera(): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    // No browser a câmara via Alert não é fiável — usa a galeria/ficheiro
    return launchLibrary();
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permissão', 'Precisamos de acesso à câmara.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    mimeType: result.assets[0].mimeType ?? 'image/jpeg',
  };
}

type PickImageOptions = {
  title: string;
  canRemove?: boolean;
  onPicked: (image: PickedImage) => void;
  onRemove?: () => void;
};

/**
 * Native: Alert com Câmara / Galeria.
 * Web: abre o seletor de ficheiros direto (Alert com botões não funciona no browser).
 */
export function pickImageSource(options: PickImageOptions) {
  if (Platform.OS === 'web') {
    void (async () => {
      try {
        const image = await launchLibrary();
        if (image) options.onPicked(image);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao escolher imagem';
        Alert.alert('Erro', message);
      }
    })();
    return;
  }

  const buttons: {
    text: string;
    style?: 'cancel' | 'destructive';
    onPress?: () => void;
  }[] = [
    {
      text: 'Câmara',
      onPress: () => {
        void launchCamera().then((image) => {
          if (image) options.onPicked(image);
        });
      },
    },
    {
      text: 'Galeria',
      onPress: () => {
        void launchLibrary().then((image) => {
          if (image) options.onPicked(image);
        });
      },
    },
  ];

  if (options.canRemove && options.onRemove) {
    buttons.push({
      text: 'Remover foto',
      style: 'destructive',
      onPress: options.onRemove,
    });
  }

  buttons.push({ text: 'Cancelar', style: 'cancel' });
  Alert.alert(options.title, 'Escolha uma opção', buttons);
}
