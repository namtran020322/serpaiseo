import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectClass {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  domain: string;
  competitor_domains: string[];
  country_id: string;
  country_name: string;
  location_id: string | null;
  location_name: string | null;
  language_code: string;
  language_name: string;
  device: string;
  top_results: number;
  schedule: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitorRanking {
  position: number | null;
  url: string | null;
  first_position: number | null;
  best_position: number | null;
  previous_position: number | null;
}

export interface ProjectKeyword {
  id: string;
  class_id: string;
  user_id: string;
  keyword: string;
  ranking_position: number | null;
  first_position: number | null;
  best_position: number | null;
  previous_position: number | null;
  found_url: string | null;
  competitor_rankings: Record<string, number | null> | null;
  serp_results: any;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithClasses extends Project {
  classes: ProjectClassWithKeywords[];
}

export interface ProjectClassWithKeywords extends ProjectClass {
  keywords: ProjectKeyword[];
  keywordCount: number;
  rankingStats: RankingStats;
}

export interface RankingStats {
  top3: number;
  top10: number;
  top30: number;
  top100: number;
  notFound: number;
  total: number;
}

function calculateRankingStats(keywords: ProjectKeyword[]): RankingStats {
  const stats: RankingStats = {
    top3: 0,
    top10: 0,
    top30: 0,
    top100: 0,
    notFound: 0,
    total: keywords.length,
  };

  keywords.forEach((kw) => {
    const pos = kw.ranking_position;
    if (pos === null) {
      stats.notFound++;
    } else if (pos <= 3) {
      stats.top3++;
    } else if (pos <= 10) {
      stats.top10++;
    } else if (pos <= 30) {
      stats.top30++;
    } else if (pos <= 100) {
      stats.top100++;
    } else {
      stats.notFound++;
    }
  });

  return stats;
}

// Cache configuration
const CACHE_TIME = {
  projects: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  project: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  projectClass: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
};

export function useProjects() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch classes for all projects
      const { data: classes, error: classesError } = await supabase
        .from("project_classes")
        .select("*")
        .order("created_at", { ascending: false });

      if (classesError) throw classesError;

      // Fetch keywords for all classes
      const classIds = classes?.map((c) => c.id) || [];
      let keywords: any[] = [];
      
      if (classIds.length > 0) {
        const { data: keywordsData, error: keywordsError } = await supabase
          .from("project_keywords")
          .select("*")
          .in("class_id", classIds);

        if (keywordsError) throw keywordsError;
        keywords = keywordsData || [];
      }

      // Combine data
      const projectsWithClasses: ProjectWithClasses[] = (projects || []).map((project) => {
        const projectClasses = (classes || [])
          .filter((c) => c.project_id === project.id)
          .map((cls) => {
            const classKeywords = keywords.filter((k) => k.class_id === cls.id);
            return {
              ...cls,
              competitor_domains: (cls.competitor_domains as string[]) || [],
              competitor_rankings: {},
              keywords: classKeywords,
              keywordCount: classKeywords.length,
              rankingStats: calculateRankingStats(classKeywords),
            } as ProjectClassWithKeywords;
          });

        return {
          ...project,
          domain: project.domain || "",
          classes: projectClasses,
        };
      });

      return projectsWithClasses;
    },
    enabled: !!user,
    staleTime: CACHE_TIME.projects.staleTime,
    gcTime: CACHE_TIME.projects.gcTime,
  });
}

export function useProject(projectId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["project", projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return null;

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!project) return null;

      const { data: classes, error: classesError } = await supabase
        .from("project_classes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (classesError) throw classesError;

      const classIds = classes?.map((c) => c.id) || [];
      let keywords: any[] = [];

      if (classIds.length > 0) {
        const { data: keywordsData, error: keywordsError } = await supabase
          .from("project_keywords")
          .select("*")
          .in("class_id", classIds);

        if (keywordsError) throw keywordsError;
        keywords = keywordsData || [];
      }

      const projectClasses: ProjectClassWithKeywords[] = (classes || []).map((cls) => {
        const classKeywords = keywords.filter((k) => k.class_id === cls.id);
        return {
          ...cls,
          competitor_domains: (cls.competitor_domains as string[]) || [],
          keywords: classKeywords,
          keywordCount: classKeywords.length,
          rankingStats: calculateRankingStats(classKeywords),
        };
      });

      return {
        ...project,
        domain: project.domain || "",
        classes: projectClasses,
      } as ProjectWithClasses;
    },
    enabled: !!user && !!projectId,
    staleTime: CACHE_TIME.project.staleTime,
    gcTime: CACHE_TIME.project.gcTime,
  });
}

export function useProjectClass(classId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["projectClass", classId, user?.id],
    queryFn: async () => {
      if (!user || !classId) return null;

      const { data: cls, error: classError } = await supabase
        .from("project_classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle();

      if (classError) throw classError;
      if (!cls) return null;

      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: true });

      if (keywordsError) throw keywordsError;

      const typedKeywords: ProjectKeyword[] = (keywords || []).map((k) => ({
        ...k,
        competitor_rankings: (k.competitor_rankings as Record<string, number | null>) || {},
      }));

      return {
        ...cls,
        competitor_domains: (cls.competitor_domains as string[]) || [],
        keywords: typedKeywords,
        keywordCount: typedKeywords.length,
        rankingStats: calculateRankingStats(typedKeywords),
      } as ProjectClassWithKeywords;
    },
    enabled: !!user && !!classId,
    staleTime: CACHE_TIME.projectClass.staleTime,
    gcTime: CACHE_TIME.projectClass.gcTime,
  });
}

export interface CreateProjectInput {
  name: string;
  domain: string;
}

export function useCreateProject() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("projects")
        .insert({ name: input.name, domain: input.domain, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  domain?: string;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, domain }: UpdateProjectInput) => {
      const updateData: Record<string, string> = {};
      if (name !== undefined) updateData.name = name;
      if (domain !== undefined) updateData.domain = domain;

      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
      toast({ title: "Success", description: "Project updated successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export interface CreateClassInput {
  projectId: string;
  name: string;
  domain: string;
  competitorDomains: string[];
  countryId: string;
  countryName: string;
  locationId?: string;
  locationName?: string;
  languageCode: string;
  languageName: string;
  device: string;
  topResults: number;
  schedule: string | null;
  keywords: string[];
}

export function useCreateClass() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      if (!user) throw new Error("Not authenticated");

      // Create class
      const { data: cls, error: classError } = await supabase
        .from("project_classes")
        .insert({
          project_id: input.projectId,
          user_id: user.id,
          name: input.name,
          domain: input.domain,
          competitor_domains: input.competitorDomains,
          country_id: input.countryId,
          country_name: input.countryName,
          location_id: input.locationId || null,
          location_name: input.locationName || null,
          language_code: input.languageCode,
          language_name: input.languageName,
          device: input.device,
          top_results: input.topResults,
          schedule: input.schedule,
        })
        .select()
        .single();

      if (classError) throw classError;

      // Create keywords (deduplicated)
      const uniqueKeywords = [...new Set(input.keywords.map((k) => k.trim().toLowerCase()))];
      const keywordsToInsert = uniqueKeywords
        .filter((k) => k.length > 0)
        .map((keyword) => ({
          class_id: cls.id,
          user_id: user.id,
          keyword,
        }));

      if (keywordsToInsert.length > 0) {
        const { error: keywordsError } = await supabase
          .from("project_keywords")
          .insert(keywordsToInsert);

        if (keywordsError) throw keywordsError;
      }

      return cls;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
      toast({ title: "Success", description: "Class created successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export interface UpdateClassInput {
  id: string;
  name?: string;
  competitorDomains?: string[];
  countryId?: string;
  countryName?: string;
  locationId?: string | null;
  locationName?: string | null;
  languageCode?: string;
  languageName?: string;
  device?: string;
  topResults?: number;
  schedule?: string | null;
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateClassInput) => {
      const updateData: Record<string, any> = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.competitorDomains !== undefined) updateData.competitor_domains = input.competitorDomains;
      if (input.countryId !== undefined) updateData.country_id = input.countryId;
      if (input.countryName !== undefined) updateData.country_name = input.countryName;
      if (input.locationId !== undefined) updateData.location_id = input.locationId;
      if (input.locationName !== undefined) updateData.location_name = input.locationName;
      if (input.languageCode !== undefined) updateData.language_code = input.languageCode;
      if (input.languageName !== undefined) updateData.language_name = input.languageName;
      if (input.device !== undefined) updateData.device = input.device;
      if (input.topResults !== undefined) updateData.top_results = input.topResults;
      if (input.schedule !== undefined) updateData.schedule = input.schedule;

      const { data, error } = await supabase
        .from("project_classes")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["projectClass", data.id] });
      toast({ title: "Success", description: "Class updated successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast({ title: "Success", description: "Class deleted successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export interface CheckRankingsResult {
  success: boolean;
  processed: number;
  found: number;
  notFound: number;
}

export function useCheckRankings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ classId, projectId }: { classId?: string; projectId?: string }): Promise<CheckRankingsResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke('check-project-keywords', {
        body: { classId, projectId }
      });

      if (response.error) throw response.error;
      return response.data as CheckRankingsResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["projectClass"] });
      toast({
        title: "Ranking Check Complete",
        description: `Processed ${data.processed} keywords. Found: ${data.found}, Not found: ${data.notFound}`
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error checking rankings",
        description: error.message
      });
    },
  });
}
