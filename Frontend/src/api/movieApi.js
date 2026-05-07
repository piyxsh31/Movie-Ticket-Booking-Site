// Function to search movies from the backend API
export async function searchMovies(query) {
  try {
    const response = await fetch(
      ` ${import.meta.env.VITE_SERVER_URL}/api/movies/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
}
