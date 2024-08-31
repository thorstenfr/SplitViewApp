import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Button } from 'react-native';

const courses = [
  { id: '1', name: 'Mathematik' },
  { id: '2', name: 'Biologie' },
  { id: '3', name: 'Geschichte' },
];

const participants = {
  '1': ['Alice', 'Bob', 'Charlie'],
  '2': ['David', 'Eva'],
  '3': [
    'Fiona', 'George', 'Henry', 'Isabella', 'Jack', 'Katherine', 'Leon', 'Mia', 'Noah', 'Olivia',
    'Paul', 'Quinn', 'Rachel', 'Sophia', 'Thomas', 'Uma', 'Victor', 'William', 'Xander', 'Yara'
  ], // 20 Teilnehmer für den Kurs "Geschichte"
};

const CourseList = ({ onSelectCourse }) => {
  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelectCourse(item.id)}>
          <Text style={styles.item}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const ParticipantList = ({ courseId, rightPaneWidth }) => {
  const courseParticipants = participants[courseId] || [];

  // Dynamische Berechnung der Anzahl der Spalten basierend auf der Breite des RightPane
  const tileSize = 100; // Feste Größe für die Kacheln
  const numColumns = Math.floor(rightPaneWidth / (tileSize + 20)); // 20 für margin und padding

  return (
    <FlatList
      data={courseParticipants}
      keyExtractor={(item) => item}
      numColumns={numColumns}
      renderItem={({ item }) => (
        <View style={[styles.tile, { width: tileSize, height: tileSize }]}>
          <Text style={styles.tileText}>{item}</Text>
        </View>
      )}
      columnWrapperStyle={{ justifyContent: 'flex-start' }} // Verhindert das Strecken der letzten Zeile
    />
  );
};

export default function SplitView() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [rightPaneWidth, setRightPaneWidth] = useState(Dimensions.get('window').width / 2);
  const [isLeftPaneVisible, setIsLeftPaneVisible] = useState(true); // Zustand für die Sichtbarkeit des LeftPane
  const isLargeScreen = Dimensions.get('window').width >= 768; // Annahme: 768 als Grenze für große Bildschirme (z.B. iPads)

  const toggleLeftPane = () => {
    setIsLeftPaneVisible(!isLeftPaneVisible);
  };

  return (
    <View style={styles.container}>
      {isLargeScreen && isLeftPaneVisible && (
        <View style={styles.leftPane}>
          <CourseList onSelectCourse={setSelectedCourse} />
        </View>
      )}
      <View
        style={[styles.rightPane, isLeftPaneVisible ? null : styles.rightPaneFull]}
        onLayout={(event) => setRightPaneWidth(event.nativeEvent.layout.width)} // Erfassen der Breite von RightPane
      >
        <Button title={isLeftPaneVisible ? "LeftPane ausblenden" : "LeftPane einblenden"} onPress={toggleLeftPane} />
        <ParticipantList courseId={selectedCourse} rightPaneWidth={rightPaneWidth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  rightPane: {
    flex: 2, // Standardgröße, wenn LeftPane sichtbar ist
    backgroundColor: '#ffffff',
    padding: 10,
  },
  rightPaneFull: {
    flex: 3, // Wenn LeftPane ausgeblendet ist, nimmt der rechte Bereich mehr Platz ein
  },
  fullPane: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  item: {
    padding: 15,
    fontSize: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tile: {
    margin: 10,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
