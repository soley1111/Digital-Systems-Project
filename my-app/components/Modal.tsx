import { Modal as RNModal, ModalProps, KeyboardAvoidingView, View, Platform, StyleSheet } from 'react-native';
import Colours from '../constant/Colours';

type PROPS = ModalProps & {
  isOpen: boolean;
  withInput: boolean;
};

export const Modal = ({ isOpen, withInput, children, ...props }: PROPS) => {
    const content = withInput ? (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0} 
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.modalContentContainer}>{children}</View>
      </KeyboardAvoidingView>
    ) : (
      <View style={styles.modalContentContainer}>{children}</View>
    );
  
    return (
      <RNModal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        {...props}
      >
        <View style={styles.modalOverlay}>
          {content}
        </View>
      </RNModal>
    );
  };

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContentContainer: {
    backgroundColor: Colours.bg_colour,
    padding: 8,
    borderRadius: 15,
    width: '85%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
});