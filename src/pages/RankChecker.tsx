import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";
import { locations } from "@/data/locations";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
}

export default function RankChecker() {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [device, setDevice] = useState("desktop");
  const [topResults, setTopResults] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SerpResult[]>([]);
  const [targetRanking, setTargetRanking] = useState<number | null>(null);
  const [showApiWarning, setShowApiWarning] = useState(true);
  const { toast } = useToast();

  // Filter locations by selected country
  const filteredLocations = locations.filter((loc) => {
    if (!country) return true;
    const selectedCountry = countries.find((c) => c.id === country);
    return selectedCountry && loc.canonicalName.includes(selectedCountry.name);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập từ khóa cần kiểm tra",
      });
      return;
    }

    if (!country) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chọn quốc gia",
      });
      return;
    }

    if (!language) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chọn ngôn ngữ",
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setTargetRanking(null);

    // Simulate API call with mock data for now
    // Real implementation will use edge function to call XMLRiver API
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock results
    const mockResults: SerpResult[] = [
      {
        position: 1,
        title: "Marketing là gì? Định nghĩa và các loại hình Marketing",
        url: "https://example.com/marketing-la-gi",
        description: "Marketing là hoạt động quảng bá sản phẩm, dịch vụ...",
      },
      {
        position: 2,
        title: "Tổng quan về Marketing - Khái niệm cơ bản",
        url: "https://marketing.edu.vn/khai-niem",
        description: "Hiểu rõ về marketing và ứng dụng trong kinh doanh...",
      },
      {
        position: 3,
        title: "Marketing cho người mới bắt đầu",
        url: "https://blog.example.org/marketing-101",
        description: "Hướng dẫn chi tiết về marketing dành cho người mới...",
      },
      {
        position: 4,
        title: "7P trong Marketing Mix là gì?",
        url: "https://marketingpro.vn/7p-marketing",
        description: "Phân tích 7P trong marketing mix hiện đại...",
      },
      {
        position: 5,
        title: "Chiến lược Marketing hiệu quả 2024",
        url: "https://business.com/chien-luoc-marketing",
        description: "Các chiến lược marketing được áp dụng nhiều nhất...",
      },
    ];

    setResults(mockResults);

    // Check if target URL is in results
    if (targetUrl.trim()) {
      const found = mockResults.find((r) =>
        r.url.toLowerCase().includes(targetUrl.toLowerCase())
      );
      if (found) {
        setTargetRanking(found.position);
        toast({
          title: "Tìm thấy!",
          description: `URL của bạn đang xếp hạng #${found.position}`,
        });
      } else {
        setTargetRanking(-1);
        toast({
          variant: "destructive",
          title: "Không tìm thấy",
          description: `URL không xuất hiện trong top ${topResults} kết quả`,
        });
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kiểm tra thứ hạng từ khóa</h1>
        <p className="text-muted-foreground mt-2">
          Nhập từ khóa và thông tin để kiểm tra vị trí trên Google SERP
        </p>
      </div>

      {showApiWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chế độ Demo</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Tính năng đang chạy ở chế độ demo. Để sử dụng API thật, cần cấu hình XMLRiver API credentials.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowApiWarning(false)}>
              Đóng
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Thông tin tìm kiếm
            </CardTitle>
            <CardDescription>
              Điền đầy đủ thông tin để có kết quả chính xác nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Từ khóa *</Label>
                <Input
                  id="keyword"
                  placeholder="Ví dụ: marketing là gì"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetUrl">URL cần tìm (tùy chọn)</Label>
                <Input
                  id="targetUrl"
                  placeholder="example.com hoặc https://example.com/page"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Quốc gia *</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn quốc gia" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Vị trí cụ thể (tùy chọn)</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.canonicalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Ngôn ngữ *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngôn ngữ" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.lang} value={lang.lang}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device">Thiết bị</Label>
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topResults">Số kết quả kiểm tra</Label>
                <Select value={topResults} onValueChange={setTopResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="30">Top 30</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                    <SelectItem value="100">Top 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Kiểm tra thứ hạng
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Kết quả tìm kiếm</CardTitle>
                <CardDescription>
                  {results.length > 0
                    ? `Hiển thị ${results.length} kết quả`
                    : "Nhập thông tin và nhấn kiểm tra để xem kết quả"}
                </CardDescription>
              </div>
              {targetRanking !== null && (
                <Badge
                  variant={targetRanking > 0 ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {targetRanking > 0 ? `#${targetRanking}` : "Không tìm thấy"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Đang tìm kiếm kết quả...</p>
              </div>
            ) : results.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead className="w-24">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow
                      key={result.position}
                      className={
                        targetUrl &&
                        result.url.toLowerCase().includes(targetUrl.toLowerCase())
                          ? "bg-primary/5"
                          : ""
                      }
                    >
                      <TableCell>
                        <Badge variant="outline">{result.position}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium line-clamp-1">{result.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {result.url}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Chưa có kết quả</p>
                  <p className="text-sm text-muted-foreground">
                    Điền thông tin và nhấn "Kiểm tra thứ hạng" để bắt đầu
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
