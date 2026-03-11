import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";
import { ComplianceTask, TaskStatus } from "@/types";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const statusColor: Record<TaskStatus, string> = {
  Overdue: "#b5332a",
  "Not started": "#a09786",
  "In progress": "#2a5a8a",
  Done: "#1f7a3f",
};

const statusBadge: Record<TaskStatus, "red" | "gray" | "blue" | "green"> = {
  Overdue: "red",
  "Not started": "gray",
  "In progress": "blue",
  Done: "green",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // Monday-based: Mon=0 ... Sun=6
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

export default function CalendarScreen() {
  const { farmProfile } = useApp();
  const tasks = deriveTasks(farmProfile);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  // Build task map: day number -> tasks
  const tasksByDay: Record<number, ComplianceTask[]> = {};
  for (const task of tasks) {
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  }

  // Also check overdue tasks from any prior month and pin them to day 1 of current view
  const overduePinned: ComplianceTask[] = [];
  for (const task of tasks) {
    if (task.status === "Overdue") {
      const d = new Date(task.dueDate);
      if (d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < month)) {
        overduePinned.push(task);
      }
    }
  }

  const selectedTasks = selectedDay !== null ? (tasksByDay[selectedDay] ?? []) : [];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  // Build grid cells: nulls for empty leading cells
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Calendar</AppText>
        <AppText tone="muted">Compliance deadlines at a glance.</AppText>
      </View>

      <Card>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <Pressable style={styles.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={20} color="#3f6a52" />
          </Pressable>
          <AppText variant="subtitle">{monthName}</AppText>
          <Pressable style={styles.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={20} color="#3f6a52" />
          </Pressable>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.weekRow}>
          {DAYS.map((d) => (
            <View key={d} style={styles.weekCell}>
              <AppText variant="label" tone="muted" style={styles.weekLabel}>{d}</AppText>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {Array.from({ length: cells.length / 7 }, (_, weekIdx) => (
          <View key={weekIdx} style={styles.weekRow}>
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, i) => {
              const hasTasks = day !== null && !!tasksByDay[day];
              const hasOverdue = hasTasks && tasksByDay[day!].some((t) => t.status === "Overdue");
              const selected = day === selectedDay;

              return (
                <Pressable
                  key={i}
                  style={[
                    styles.dayCell,
                    selected && styles.dayCellSelected,
                    isToday(day ?? -1) && styles.dayCellToday,
                  ]}
                  onPress={() => day && setSelectedDay(selected ? null : day)}
                  disabled={!day}
                >
                  {day ? (
                    <>
                      <AppText
                        style={[
                          styles.dayNumber,
                          selected && styles.dayNumberSelected,
                          isToday(day) && styles.dayNumberToday,
                        ]}
                      >
                        {day}
                      </AppText>
                      {hasTasks && (
                        <View
                          style={[
                            styles.taskDot,
                            { backgroundColor: hasOverdue ? "#b5332a" : "#3f6a52" },
                          ]}
                        />
                      )}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3f6a52" }]} />
            <AppText variant="caption" tone="muted">Deadline</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#b5332a" }]} />
            <AppText variant="caption" tone="muted">Overdue</AppText>
          </View>
        </View>
      </Card>

      {/* Overdue pinned tasks from prior months */}
      {overduePinned.length > 0 && (
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={16} color="#b5332a" />
            <AppText variant="subtitle" tone="danger">Past-Due Tasks</AppText>
          </View>
          {overduePinned.map((task, i) => (
            <View key={task.id}>
              {i > 0 && <Divider />}
              <View style={styles.taskRow}>
                <AppText style={styles.taskTitle}>{task.title}</AppText>
                <View style={styles.taskMeta}>
                  <AppText variant="caption" tone="danger">Due {task.dueDate}</AppText>
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Selected day tasks */}
      {selectedDay !== null && (
        <Card variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={16} color="#3f6a52" />
            <AppText variant="subtitle">
              {new Date(year, month, selectedDay).toLocaleDateString("default", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </AppText>
          </View>
          {selectedTasks.length === 0 ? (
            <AppText variant="caption" tone="muted">No tasks due on this day.</AppText>
          ) : (
            selectedTasks.map((task, i) => (
              <View key={task.id}>
                {i > 0 && <Divider />}
                <View style={styles.taskRow}>
                  <View style={styles.taskTop}>
                    <AppText style={styles.taskTitle}>{task.title}</AppText>
                    <Badge label={task.status} color={statusBadge[task.status]} />
                  </View>
                  <AppText variant="caption" tone="muted">{task.source}</AppText>
                  <AppText variant="caption" tone="muted" style={{ lineHeight: 19 }}>
                    {task.guidance}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#e6efe9",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekLabel: {
    fontSize: 10,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    gap: 2,
    margin: 1,
  },
  dayCellSelected: {
    backgroundColor: "#e6efe9",
    borderWidth: 1.5,
    borderColor: "#3f6a52",
  },
  dayCellToday: {
    backgroundColor: "#fdf4e3",
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c2517",
  },
  dayNumberSelected: {
    color: "#2d5740",
  },
  dayNumberToday: {
    color: "#8a6514",
    fontWeight: "800",
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskRow: {
    gap: 4,
    paddingVertical: 4,
  },
  taskTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  taskTitle: {
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
