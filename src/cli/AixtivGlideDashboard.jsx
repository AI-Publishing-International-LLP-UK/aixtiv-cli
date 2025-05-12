import React, { useState, useEffect } from "react";
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Grid, 
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Badge,
  Divider
} from "@mui/material";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Adjust import path as needed

/**
 * Aixtiv Glide Dashboard Component
 * 
 * This component is optimized for Glide integration and displays
 * Aixtiv Cards with filtering and search capabilities.
 */
const AixtivGlideDashboard = () => {
  // State management
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("all");
  const [batch, setBatch] = useState("all");
  const [loading, setLoading] = useState(true);
  
  // List of agents for filter
  const agents = [
    "Dr. Grant",
    "QBLucy",
    "Dr. Match",
    "Dr. Sabina",
    "Dr. Burby",
    "Professor Lee"
  ];
  
  // Batches (1-6)
  const batches = Array.from({ length: 6 }, (_, i) => i + 1);

  // Fetch cards from Firestore
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const cardsRef = collection(db, "aixtiv_cards");
        const querySnapshot = await getDocs(cardsRef);
        
        const cardData = [];
        querySnapshot.forEach((doc) => {
          cardData.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by card_id
        cardData.sort((a, b) => a.card_id.localeCompare(b.card_id));
        
        setCards(cardData);
        setFilteredCards(cardData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching cards:", error);
        setLoading(false);
      }
    };
    
    fetchCards();
  }, []);
  
  // Filter cards based on search and filters
  useEffect(() => {
    let results = [...cards];
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(card => 
        card.title.toLowerCase().includes(searchLower) || 
        card.use_case.toLowerCase().includes(searchLower) ||
        card.blog_title.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by agent
    if (agent !== "all") {
      results = results.filter(card => card.assigned_agent === agent);
    }
    
    // Filter by batch
    if (batch !== "all") {
      results = results.filter(card => card.batch_number === parseInt(batch));
    }
    
    setFilteredCards(results);
  }, [search, agent, batch, cards]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };
  
  // Handle agent filter change
  const handleAgentChange = (e) => {
    setAgent(e.target.value);
  };
  
  // Handle batch filter change
  const handleBatchChange = (e) => {
    setBatch(e.target.value);
  };
  
  // Get agent color for visual indication
  const getAgentColor = (agent) => {
    const colorMap = {
      "Dr. Grant": "#4285F4",      // Blue
      "QBLucy": "#EA4335",         // Red
      "Dr. Match": "#FBBC05",      // Yellow
      "Dr. Sabina": "#34A853",     // Green
      "Dr. Burby": "#8F00FF",      // Purple
      "Professor Lee": "#FF6D01"   // Orange
    };
    
    return colorMap[agent] || "#757575";
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header and Filters */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Aixtiv Symphony Cards
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Search */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search cards by title or use case"
              variant="outlined"
              value={search}
              onChange={handleSearchChange}
            />
          </Grid>
          
          {/* Agent Filter */}
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Agent</InputLabel>
              <Select value={agent} onChange={handleAgentChange} label="Agent">
                <MenuItem value="all">All Agents</MenuItem>
                {agents.map((agentName) => (
                  <MenuItem key={agentName} value={agentName}>
                    {agentName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Batch Filter */}
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Batch</InputLabel>
              <Select value={batch} onChange={handleBatchChange} label="Batch">
                <MenuItem value="all">All Batches</MenuItem>
                {batches.map((batchNum) => (
                  <MenuItem key={batchNum} value={batchNum}>
                    Batch {batchNum}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Results count */}
        <Typography variant="body2" color="text.secondary">
          Showing {filteredCards.length} of {cards.length} cards
        </Typography>
      </Box>
      
      {/* Cards Grid */}
      <Grid container spacing={3}>
        {loading ? (
          <Grid item xs={12}>
            <Typography>Loading cards...</Typography>
          </Grid>
        ) : filteredCards.length > 0 ? (
          filteredCards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.card_id}>
              <Card 
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: `4px solid ${getAgentColor(card.assigned_agent)}`
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {card.card_id}
                  </Typography>
                  
                  <Typography variant="h6" component="h2" gutterBottom>
                    {card.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {card.use_case}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="body2" sx={{ mb: 1.5 }}>
                    <strong>Agent Benefit:</strong> {card.agent_benefit}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 1.5 }}>
                    <strong>Blog:</strong> {card.blog_title}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 1 }}>
                    <Chip
                      size="small"
                      label={card.assigned_agent}
                      sx={{
                        backgroundColor: getAgentColor(card.assigned_agent),
                        color: 'white'
                      }}
                    />
                    <Chip
                      size="small"
                      label={`Batch ${card.batch_number || '?'}`}
                      variant="outlined"
                    />
                  </Stack>
                  
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                    {card.tags && card.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </Stack>
                </CardContent>
                
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button variant="contained" size="small" fullWidth>
                    Deploy Card
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography align="center">
              No cards found matching your filters.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AixtivGlideDashboard;