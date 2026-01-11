-- Policy: Ngăn UPDATE (bảo toàn tính toàn vẹn dữ liệu lịch sử)
CREATE POLICY "Users cannot update history records"
ON public.keyword_ranking_history
FOR UPDATE
TO authenticated
USING (false);

-- Policy: Cho phép DELETE record của chính user
CREATE POLICY "Users can delete own history"
ON public.keyword_ranking_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Thêm unique constraint cho domain per user
ALTER TABLE public.projects 
ADD CONSTRAINT unique_user_domain 
UNIQUE (user_id, domain);