"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { MoonIcon, SunIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function BPODashboard() {
  const [darkMode, setDarkMode] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [newStatus, setNewStatus] = useState("Pending")
  const [notes, setNotes] = useState("")
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" })
  const [activeTab, setActiveTab] = useState("schedules")
  const { toast } = useToast()

  useEffect(() => {
    // Check for dark mode preference
    const darkModePreference = localStorage.getItem("darkMode")
    if (darkModePreference === "true") {
      setDarkMode(true)
      document.documentElement.classList.add("dark")
    }

    // Load schedules
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/schedules`)

      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.status}`)
      }

      const data = await response.json()
      setSchedules(data)
    } catch (error) {
      console.error("Error fetching schedules:", error)
      toast({
        title: "Error",
        description: "Failed to load schedules. Please try again.",
        variant: "destructive",
      })

      // Fallback to mock data if API is unavailable
      const mockSchedules = [
        {
          id: "abc123",
          query: "I have an issue with my recent order #12345",
          date: "2025-03-19",
          time: "10:00 AM",
          priority: "High",
          status: "Pending",
          created_at: "2025-03-18T09:30:00.000Z",
          sentiment: "2 stars",
        },
        {
          id: "def456",
          query: "When will my order be delivered?",
          date: "2025-03-20",
          time: "10:00 AM",
          priority: "Medium",
          status: "Scheduled",
          created_at: "2025-03-18T10:15:00.000Z",
          sentiment: "3 stars",
        },
        {
          id: "ghi789",
          query: "I love your product! Just wanted to say thanks.",
          date: "2025-03-21",
          time: "10:00 AM",
          priority: "Low",
          status: "Completed",
          created_at: "2025-03-18T11:45:00.000Z",
          sentiment: "5 stars",
        },
      ]

      setSchedules(mockSchedules)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    }
  }

  const handleUpdateStatus = async (scheduleId) => {
    try {
      const formData = new FormData()
      formData.append("status", newStatus)
      formData.append("notes", notes || "")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/update-schedule/${scheduleId}`,
        {
          method: "POST",
          body: formData,
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to update schedule: ${response.status}`)
      }

      // Refresh schedules after update
      fetchSchedules()
      setSelectedSchedule(null)
      setNotes("")

      toast({
        title: "Status Updated",
        description: `Schedule ${scheduleId} has been updated to ${newStatus}.`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddFaq = async (e) => {
    e.preventDefault()

    try {
      const formData = new FormData()
      formData.append("question", newFaq.question)
      formData.append("answer", newFaq.answer)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/add-faq`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to add FAQ: ${response.status}`)
      }

      toast({
        title: "FAQ Added",
        description: `New FAQ "${newFaq.question}" has been added.`,
      })

      setNewFaq({ question: "", answer: "" })
    } catch (error) {
      console.error("Error adding FAQ:", error)
      toast({
        title: "Error",
        description: "Failed to add FAQ. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return darkMode ? "text-yellow-300" : "text-yellow-600"
      case "scheduled":
        return darkMode ? "text-blue-300" : "text-blue-600"
      case "completed":
        return darkMode ? "text-green-300" : "text-green-600"
      case "cancelled":
        return darkMode ? "text-red-300" : "text-red-600"
      default:
        return ""
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return darkMode ? "text-red-300" : "text-red-600"
      case "medium":
        return darkMode ? "text-yellow-300" : "text-yellow-600"
      case "low":
        return darkMode ? "text-green-300" : "text-green-600"
      default:
        return ""
    }
  }

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-100"}`}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>BPO Dashboard</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <main>
          <Tabs defaultValue="schedules" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
              <TabsTrigger value="faq">Manage FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="schedules">
              <Card className={darkMode ? "bg-gray-800 text-white border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle>Callback Schedules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={darkMode ? "border-gray-700" : ""}>
                          <TableHead>ID</TableHead>
                          <TableHead>Query</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sentiment</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.length === 0 ? (
                          <TableRow className={darkMode ? "border-gray-700" : ""}>
                            <TableCell colSpan={8} className="text-center py-4">
                              No schedules found
                            </TableCell>
                          </TableRow>
                        ) : (
                          schedules.map((schedule) => (
                            <TableRow key={schedule.id} className={darkMode ? "border-gray-700" : ""}>
                              <TableCell>{schedule.id}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{schedule.query}</TableCell>
                              <TableCell>{schedule.date}</TableCell>
                              <TableCell>{schedule.time}</TableCell>
                              <TableCell className={getPriorityColor(schedule.priority)}>{schedule.priority}</TableCell>
                              <TableCell className={getStatusColor(schedule.status)}>{schedule.status}</TableCell>
                              <TableCell>{schedule.sentiment}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSchedule(schedule)
                                    setNewStatus(schedule.status || "Pending")
                                  }}
                                >
                                  Update
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faq">
              <Card className={darkMode ? "bg-gray-800 text-white border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle>Add New FAQ</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddFaq} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="question" className={darkMode ? "text-gray-300" : ""}>
                        Question
                      </Label>
                      <Input
                        id="question"
                        value={newFaq.question}
                        onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                        placeholder="Enter FAQ question"
                        className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="answer" className={darkMode ? "text-gray-300" : ""}>
                        Answer
                      </Label>
                      <Textarea
                        id="answer"
                        value={newFaq.answer}
                        onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                        placeholder="Enter FAQ answer"
                        className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}
                        rows={4}
                        required
                      />
                    </div>

                    <Button type="submit">Add FAQ</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Update Status Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className={`w-full max-w-md ${darkMode ? "bg-gray-800 text-white border-gray-700" : ""}`}>
            <CardHeader>
              <CardTitle>Update Schedule Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-3 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <p>
                    <strong>ID:</strong> {selectedSchedule.id}
                  </p>
                  <p>
                    <strong>Query:</strong> {selectedSchedule.query}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedSchedule.date}
                  </p>
                  <p>
                    <strong>Priority:</strong> {selectedSchedule.priority}
                  </p>
                  <p>
                    <strong>Current Status:</strong> {selectedSchedule.status}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status" className={darkMode ? "text-gray-300" : ""}>
                    New Status
                  </Label>
                  <Select
                    defaultValue={selectedSchedule.status || "Pending"}
                    onValueChange={(value) => setNewStatus(value)}
                  >
                    <SelectTrigger className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className={darkMode ? "bg-gray-800 border-gray-700 text-white" : ""}>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes" className={darkMode ? "text-gray-300" : ""}>
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this update"
                    className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateStatus(selectedSchedule.id)}>Update</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

