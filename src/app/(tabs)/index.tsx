import { router } from 'expo-router';
import { View } from 'react-native';
import { Button } from '../../components/ui';
import { space } from '../../lib/theme';

export default function OfficeScreen() {
  return (
    <View style={{ flex: 1, padding: space, justifyContent: 'center' }}>
      <Button title="今すぐ1問解く" onPress={() => router.push('/quiz')} />
    </View>
  );
}
