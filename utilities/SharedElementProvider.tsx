import React, { createContext, useContext, useRef, ReactNode } from "react";
import { View, Animated, ViewStyle } from "react-native";
import {
  SharedElementTransition,
  SharedElementNode,
} from "react-native-shared-element";
import { styles } from "../styles/utilities/SharedElementProvider.styles";

interface SharedElementContextProps {
  startAncestor: SharedElementNode | null;
  startNode: SharedElementNode | null;
  endAncestor: SharedElementNode | null;
  endNode: SharedElementNode | null;
  position: Animated.Value;
}

const SharedElementContext = createContext<SharedElementContextProps | null>(
  null
);

interface SharedElementProviderProps {
  children: any;
}

const SharedElementProvider: React.FC<SharedElementProviderProps> = ({
  children,
}) => {
  const startAncestor = useRef<SharedElementNode | null>(null);
  const startNode = useRef<SharedElementNode | null>(null);
  const endAncestor = useRef<SharedElementNode | null>(null);
  const endNode = useRef<SharedElementNode | null>(null);
  const position = useRef(new Animated.Value(0)).current;

  const contextValue: SharedElementContextProps = {
    startAncestor: startAncestor.current,
    startNode: startNode.current,
    endAncestor: endAncestor.current,
    endNode: endNode.current,
    position,
  };

  return (
    <SharedElementContext.Provider value={contextValue}>
      <View style={styles.container}>{children}</View>
      <Animated.View style={styles.overlay}>
        <SharedElementTransition
          start={{
            node: startNode.current,
            ancestor: startAncestor.current,
          }}
          end={{
            node: endNode.current,
            ancestor: endAncestor.current,
          }}
          position={position}
          animation="move"
          resize="auto"
          align="auto"
        />
      </Animated.View>
    </SharedElementContext.Provider>
  );
};

const useSharedElement = () => {
  const context = useContext(SharedElementContext);
  if (!context) {
    throw new Error(
      "useSharedElement must be used within a SharedElementProvider"
    );
  }
  return context;
};

export { SharedElementProvider, useSharedElement };
