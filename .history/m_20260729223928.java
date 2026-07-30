import java.util.*;

// Main class representing the Food Delivery Routing System
public class FoodDeliverySystem {
    
    // The Graph class implemented using an Adjacency List
    static class DeliveryGraph {
        // Map to store vertices and their corresponding adjacency lists
        private Map<String, List<String>> adjList;

        // Constructor
        public DeliveryGraph() {
            this.adjList = new LinkedHashMap<>(); // LinkedHashMap maintains insertion order
        }

        // Method to add a new vertex (location) to the delivery network
        public void addVertex(String locationName) {
            adjList.putIfAbsent(locationName, new ArrayList<>());
        }

        // Method to add a directed edge (road path) between two locations
        public void addEdge(String source, String destination) {
            // Ensure both locations exist in the graph before connecting
            if (!adjList.containsKey(source)) {
                addVertex(source);
            }
            if (!adjList.containsKey(destination)) {
                addVertex(destination);
            }
            
            // Add the destination to the source's adjacency list (Directed Graph)
            adjList.get(source).add(destination);
        }

        // Method to display the internal graph structure mapping
        public void printGraph() {
            System.out.println("=== Delivery Network Topology (Adjacency List) ===");
            for (String vertex : adjList.keySet()) {
                System.out.print(vertex + " -> ");
                List<String> neighbors = adjList.get(vertex);
                if (neighbors.isEmpty()) {
                    System.out.println("[End of Route]");
                } else {
                    System.out.println(String.join(", ", neighbors));
                }
            }
            System.out.println("==================================================\n");
        }

        // BFS Algorithm implementation to traverse the network for delivery dispatch
        public void breadthFirstSearchDelivery(String startHubVertex) {
            if (!adjList.containsKey(startHubVertex)) {
                System.out.println("Error: The Central Hub '" + startHubVertex + "' does not exist in the network.");
                return;
            }

            System.out.println("=== Initiating Delivery Dispatch Routing (BFS) ===");
            System.out.println("Origin Point: " + startHubVertex);
            
            // Step 1: Initialize tracking map for visited locations
            Set<String> visited = new HashSet<>();
            
            // Step 2: Initialize the FIFO (First-In-First-Out) Queue structure
            Queue<String> dispatchQueue = new LinkedList<>();
            
            // Step 3: Seed the initial starting dispatch hub
            visited.add(startHubVertex);
            dispatchQueue.add(startHubVertex);
            
            int deliverySequence = 1;

            // Step 4: Iterative Level-Order Processing Loop
            while (!dispatchQueue.isEmpty()) {
                // Fetch the current active vertex location
                String currentLocation = dispatchQueue.poll();
                
                // Process and Log Route
                if (!currentLocation.equals(startHubVertex)) {
                    System.out.println("Delivery Sequence #" + deliverySequence + ": Proceed to -> " + currentLocation);
                    deliverySequence++;
                }

                // Step 5: Extract and iterate over true structural neighbors
                List<String> adjacentRoadsList = adjList.get(currentLocation);
                if (adjacentRoadsList != null) {
                    for (String neighborLocation : adjacentRoadsList) {
                        // If the neighboring location has not yet been visited/queued
                        if (!visited.contains(neighborLocation)) {
                            visited.add(neighborLocation);
                            dispatchQueue.add(neighborLocation);
                        }
                    }
                }
            }
            System.out.println("=== All accessible locations have been routed ===\n");
        }
    }

    // Main execution method
    public static void main(String[] args) {
        // Instantiate the Delivery Graph
        DeliveryGraph routingSystem = new DeliveryGraph();

        // 1. Initialize Vertices (Adding locations as per the report's conceptual mapping)
        routingSystem.addVertex("Restaurant");
        routingSystem.addVertex("Junction 1");
        routingSystem.addVertex("Junction 2");
        routingSystem.addVertex("Customer A");
        routingSystem.addVertex("Customer B");

        // 2. Connect Routes / Add Edges (Creating the directed road network)
        // Restaurant connects to Junction 1 and Junction 2
        routingSystem.addEdge("Restaurant", "Junction 1");
        routingSystem.addEdge("Restaurant", "Junction 2");
        
        // Junction 1 connects to Customer A and Junction 2
        routingSystem.addEdge("Junction 1", "Customer A");
        routingSystem.addEdge("Junction 1", "Junction 2");
        
        // Junction 2 connects to Customer B
        routingSystem.addEdge("Junction 2", "Customer B");

        // 3. Display the graph structure
        routingSystem.printGraph();

        // 4. Execute the BFS Traversal to generate the dispatch routing sequence
        routingSystem.breadthFirstSearchDelivery("Restaurant");
    }
}