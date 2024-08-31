import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Button, TextInput } from 'react-native';
import * as SQLite from 'expo-sqlite';

// Öffne die SQLite-Datenbank asynchron
const openDatabase = async () => {
  const db = await SQLite.openDatabaseAsync('courseDB.db');
  return db;
};

const initializeDatabase = async (db) => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        course_id INTEGER,
        FOREIGN KEY(course_id) REFERENCES courses(id)
      );
      CREATE TABLE IF NOT EXISTS points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(participant_id) REFERENCES participants(id)
      );
    `);
  } catch (error) {
    console.error("Error initializing database", error);
  }
};

const checkAndPopulateDemoData = async (db, fetchCourses, fetchParticipants) => {
  try {
    const courses = await db.getAllAsync('SELECT * FROM courses;');
    if (courses.length === 0) {
      // Wenn keine Kurse vorhanden sind, füge einen Demokurs hinzu
      await db.runAsync('INSERT INTO courses (name) VALUES (?);', ['Demokurs']);
      const demoCourseId = (await db.getFirstAsync('SELECT id FROM courses WHERE name = ?;', ['Demokurs'])).id;
      
      // Erstelle 20 Teilnehmer für den Demokurs
      const participantNames = Array.from({ length: 20 }, (_, i) => `Teilnehmer ${i + 1}`);
      for (const name of participantNames) {
        await db.runAsync('INSERT INTO participants (name, course_id) VALUES (?, ?);', [name, demoCourseId]);
      }

      // Füge zufällige Pluspunkte mit zufälligen Zeitstempeln hinzu
      const participants = await db.getAllAsync('SELECT id FROM participants WHERE course_id = ?;', [demoCourseId]);
      for (const participant of participants) {
        // Zufällige Anzahl von Pluspunkten zwischen 1 und 10
        const randomPoints = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < randomPoints; i++) {
          const randomDate = getRandomDate(new Date(2022, 0, 1), new Date());
          await db.runAsync('INSERT INTO points (participant_id, timestamp) VALUES (?, ?);', [participant.id, randomDate.toISOString()]);
        }
      }

      // Aktualisiere den Zustand
      fetchCourses();
      fetchParticipants();
    }
  } catch (error) {
    console.error("Error populating demo data", error);
  }
};

const getRandomDate = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date;
};

const fetchCourses = async (db, setCourses) => {
  try {
    const courses = await db.getAllAsync('SELECT * FROM courses;');
    setCourses(courses);
  } catch (error) {
    console.error("Error fetching courses", error);
  }
};

const fetchParticipants = async (db, setParticipants) => {
  try {
    const participants = await db.getAllAsync(`
      SELECT p.*, COUNT(pt.id) as points 
      FROM participants p 
      LEFT JOIN points pt ON pt.participant_id = p.id 
      GROUP BY p.id;
    `);
    const participantsByCourse = {};
    participants.forEach(participant => {
      if (!participantsByCourse[participant.course_id]) {
        participantsByCourse[participant.course_id] = [];
      }
      participantsByCourse[participant.course_id].push(participant);
    });
    setParticipants(participantsByCourse);
  } catch (error) {
    console.error("Error fetching participants", error);
  }
};

const addCourseToDB = async (db, courseName, fetchCourses) => {
  try {
    await db.runAsync('INSERT INTO courses (name) VALUES (?);', [courseName]);
    fetchCourses();
  } catch (error) {
    console.error("Error adding course to DB", error);
  }
};

const addParticipantToDB = async (db, courseId, participantName, fetchParticipants) => {
  try {
    await db.runAsync('INSERT INTO participants (name, course_id) VALUES (?, ?);', [participantName, courseId]);
    fetchParticipants();
  } catch (error) {
    console.error("Error adding participant to DB", error);
  }
};

const addPointToDB = async (db, participantId, fetchParticipants) => {
  try {
    await db.runAsync('INSERT INTO points (participant_id) VALUES (?);', [participantId]);
    fetchParticipants();
  } catch (error) {
    console.error("Error adding point to DB", error);
  }
};

const CourseList = ({ courses, onSelectCourse, onAddCourse }) => {
  const [newCourseName, setNewCourseName] = useState('');

  const handleAddCourse = () => {
    if (newCourseName.trim()) {
      onAddCourse(newCourseName);
      setNewCourseName('');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelectCourse(item.id)}>
            <Text style={styles.item}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <TextInput
        style={styles.input}
        placeholder="Neuer Kursname"
        value={newCourseName}
        onChangeText={setNewCourseName}
      />
      <Button title="Kurs hinzufügen" onPress={handleAddCourse} />
    </View>
  );
};

const ParticipantList = ({ courseId, participants, onAddParticipant, onAddPoint, rightPaneWidth }) => {
  const courseParticipants = participants[courseId] || [];
  const [newParticipantName, setNewParticipantName] = useState('');

  const handleAddParticipant = () => {
    if (newParticipantName.trim()) {
      onAddParticipant(courseId, newParticipantName);
      setNewParticipantName('');
    }
  };

  const tileSize = 100; // Feste Größe für die Kacheln
  const numColumns = Math.floor(rightPaneWidth / (tileSize + 20)); // 20 für margin und padding

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={courseParticipants}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={numColumns.toString()} // Hinzufügen eines Schlüssels, um eine Neudarstellung zu erzwingen, wenn sich numColumns ändert
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onAddPoint(item.id)}>
            <View style={[styles.tile, { width: tileSize, height: tileSize }]}>
              <Text style={styles.tileText}>{item.name}</Text>
              <Text style={styles.pointsText}>Punkte: {item.points}</Text>
            </View>
          </TouchableOpacity>
        )}
        columnWrapperStyle={{ justifyContent: 'flex-start' }} // Verhindert das Strecken der letzten Zeile
      />
      <TextInput
        style={styles.input}
        placeholder="Neuer Teilnehmername"
        value={newParticipantName}
        onChangeText={setNewParticipantName}
      />
      <Button title="Teilnehmer hinzufügen" onPress={handleAddParticipant} />
    </View>
  );
};

export default function SplitView() {
  const [db, setDb] = useState(null);
  const [courses, setCourses] = useState([]);
  const [participants, setParticipants] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [rightPaneWidth, setRightPaneWidth] = useState(Dimensions.get('window').width / 2);
  const [isLeftPaneVisible, setIsLeftPaneVisible] = useState(true);
  const isLargeScreen = Dimensions.get('window').width >= 768;

  useEffect(() => {
    (async () => {
      const database = await openDatabase();
      setDb(database);
      await initializeDatabase(database);
      await checkAndPopulateDemoData(database, () => fetchCourses(database, setCourses), () => fetchParticipants(database, setParticipants));
      await fetchCourses(database, setCourses);
      await fetchParticipants(database, setParticipants);
    })();
  }, []);

  const toggleLeftPane = () => {
    setIsLeftPaneVisible(!isLeftPaneVisible);
  };

  const addCourse = (courseName) => {
    if (db) {
      addCourseToDB(db, courseName, () => fetchCourses(db, setCourses));
    }
  };

  const addParticipant = (courseId, participantName) => {
    if (db) {
      addParticipantToDB(db, courseId, participantName, () => fetchParticipants(db, setParticipants));
    }
  };

  const addPoint = (participantId) => {
    if (db) {
      addPointToDB(db, participantId, () => fetchParticipants(db, setParticipants));
    }
  };

  return (
    <View style={styles.container}>
      {isLargeScreen && isLeftPaneVisible && (
        <View style={styles.leftPane}>
          <CourseList
            courses={courses}
            onSelectCourse={setSelectedCourse}
            onAddCourse={addCourse}
          />
        </View>
      )}
      <View
        style={[styles.rightPane, isLeftPaneVisible ? null : styles.rightPaneFull]}
        onLayout={(event) => setRightPaneWidth(event.nativeEvent.layout.width)}
      >
        <Button title={isLeftPaneVisible ? "LeftPane ausblenden" : "LeftPane einblenden"} onPress={toggleLeftPane} />
        <ParticipantList
          courseId={selectedCourse}
          participants={participants}
          onAddParticipant={addParticipant}
          onAddPoint={addPoint}
          rightPaneWidth={rightPaneWidth}
        />
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
    flex: 2,
    backgroundColor: '#ffffff',
    padding: 10,
  },
  rightPaneFull: {
    flex: 3,
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
  pointsText: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});
